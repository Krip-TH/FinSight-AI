import asyncio
import datetime
import pytest
from backend import market


def history(symbol, dates, adjusted):
    return {'symbol':symbol,'name':symbol,'currency':'USD','source_url':'https://finance.yahoo.com/',
            'fetched_at':'2026-01-01T00:00:00+00:00','cached':False,
            'points':[{'date':date,'close':9999,'adjusted_close':value} for date,value in zip(dates,adjusted)]}


def test_quarterly_comparison_uses_shared_dates_adjusted_prices_and_baseline():
    a=history('AAPL',['2024-01-02','2024-03-28','2024-04-01','2024-06-28','2024-07-01'],[100,110,120,130,140])
    b=history('MSFT',['2024-01-02','2024-03-28','2024-04-01','2024-06-27','2024-07-01'],[200,180,220,240,260])
    result=market.build_comparison([a,b],'5y','quarterly')
    assert result['aligned_daily_points']==4
    points=result['series'][0]['points']
    assert [p['date'] for p in points]==['2024-01-02','2024-03-28','2024-04-01','2024-07-01']
    assert [p['change_pct'] for p in points]==[0,10,20,40]
    assert result['series'][1]['points'][1]['change_pct']==-10
    assert points[0]['period_change_pct'] is None
    assert points[2]['period_change_pct']==9.0909
    assert all(p['adjusted_close']!=9999 for p in points)
    assert points[1]['is_partial'] is True


def test_monthly_sampling_keeps_current_partial_period_and_crosses_years():
    today=datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    dates=['2024-12-02','2024-12-31','2025-01-02',today]
    result=market.build_comparison([history('AAPL',dates,[100,110,120,150]),history('MSFT',dates,[200,210,220,250])],'5y','monthly')
    points=result['series'][0]['points']
    assert points[1]['label']=='2024-12' and points[2]['label']=='2025-01'
    assert points[-1]['is_partial'] is True
    assert points[-1]['date']==today and points[-1]['change_pct']==50


def test_missing_adjusted_data_cannot_be_replaced_with_close_prices():
    a=history('AAPL',['2024-01-02','2024-03-28'],[100,110])
    b=history('MSFT',['2024-01-02','2024-03-28'],[200,220])
    b['points'][1].pop('adjusted_close')
    with pytest.raises(market.HTTPException) as error:
        market.build_comparison([a,b],'5y','quarterly')
    assert error.value.status_code==502


@pytest.mark.parametrize('symbols,period,frequency',[
    (['AAPL'],'5y','quarterly'),(['AAPL','AAPL'],'5y','quarterly'),
    (['AAPL','BTC-USD'],'5y','quarterly'),(['AAPL','MSFT'],'max','quarterly'),
    (['AAPL','MSFT'],'5y','weekly')])
def test_invalid_comparison_rejected_before_request(symbols,period,frequency):
    with pytest.raises(market.HTTPException) as error:
        asyncio.run(market.stock_comparison(symbols,period,frequency))
    assert error.value.status_code==400
