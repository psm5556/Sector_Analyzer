import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import requests
from bs4 import BeautifulSoup
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import json
import time
import yfinance as yf
import cloudscraper
import urllib.parse

# 크기 조정 상수
SCALE = 0.75

# 페이지 설정
st.set_page_config(page_title="투자 포트폴리오 대시보드", layout="wide")

# 데이터 로드 (구글 시트)
@st.cache_data
def load_portfolio_data():
    import urllib.parse

    # ===== 구글 시트 정보 (st.secrets에서 읽기) =====
    SHEET_ID = st.secrets["GOOGLE_SHEET_ID"]      # 예: "1abcdEFGHijkLMNOP"
    SHEET_NAME = st.secrets["GOOGLE_SHEET_NAME"]  # 예: "포트폴리오"

    # 탭 이름 인코딩
    sheet_name_encoded = urllib.parse.quote(SHEET_NAME)

    # ===== CSV export URL 생성 =====
    csv_url = (
        f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?"
        f"tqx=out:csv&sheet={sheet_name_encoded}"
    )

    # ===== CSV를 Pandas로 로드 =====
    # B~F 열을 사용하기 위해 usecols로 1~5 인덱스 범위 지정
    df = pd.read_csv(
        csv_url,
        usecols=[1,2,3,4,5],        # B=1, C=2, D=3, E=4, F=5
        on_bad_lines="skip",
        engine="python"
    )

    # ===== 컬럼명 수동 지정 =====
    df.columns = ["팀", "자산", "섹터", "기업명", "티커"]

    return df

# # 데이터 로드 (하드코딩)
# @st.cache_data
# def load_portfolio_data():
#     data = """팀,자산,섹터,기업명,티커
# 청팀,기회자산,우주경제,Rocket Lab,RKLB
# 청팀,기회자산,우주경제,Lockheed Martin,LMT
# 청팀,기회자산,우주경제,Raytheon Technologies Corporation,RTX
# 청팀,기회자산,우주경제,Boeing,BA
# 청팀,기회자산,우주경제,Northrop Grumman,NOC
# 청팀,기회자산,우주경제,AST SpaceMobile,ASTS
# 청팀,기회자산,우주경제,Virgin Galactic,SPCE
# 청팀,기회자산,우주경제,JOBY Aviation,JOBY
# 청팀,기회자산,우주경제,Archer Aviation,ACHR
# 청팀,기회자산,장수과학,Intellia Therapeutics,NTLA
# 청팀,기회자산,장수과학,CRISPR Therapeutics,CRSP
# 청팀,기회자산,장수과학,Recursion Pharmaceuticals,RXRX
# 청팀,기회자산,장수과학,Beam Therapeutics,BEAM
# 청팀,기회자산,장수과학,UniQure,QURE
# 청팀,기회자산,장수과학,Tempus AI,TEM
# 청팀,기회자산,장수과학,HIMS&HERS,HIMS
# 청팀,기회자산,양자컴퓨터,IonQ,IONQ
# 청팀,기회자산,양자컴퓨터,D-Wave Quantum,QBTS
# 청팀,기회자산,양자컴퓨터,Rigetti Computing,RGTI
# 청팀,기회자산,양자컴퓨터,IBM,IBM
# 청팀,기회자산,양자컴퓨터,Quantum Computing,QUBT
# 청팀,성장자산,미래에너지(SMR),NuScale Power,SMR
# 청팀,성장자산,미래에너지(SMR),Oklo,OKLO
# 청팀,성장자산,미래에너지(SMR),Nano Nuclear Energy,NNE
# 청팀,성장자산,미래에너지(SMR),BWX Technologies,BWXT
# 청팀,성장자산,미래에너지(SMR),Centrus Energy Corp.,LEU
# 청팀,성장자산,미래에너지(SMR),Uranium Energy,UEC
# 청팀,성장자산,미래에너지(SMR),Cameco (US-listed),CCJ
# 청팀,기회자산,합성생물학,Ginkgo Bioworks,DNA
# 청팀,기회자산,합성생물학,Twist Bioscience,TWST
# 청팀,기회자산,합성생물학,10x Genomics,TXG
# 청팀,기회자산,합성생물학,Appsella Biologics,ABCL
# 청팀,기회자산,양자 암호,Arqit,ARQQ
# 청팀,기회자산,양자 암호,SEALSQ,LAES
# 청팀,기회자산,양자 암호,BTQ,BTQ
# 청팀,기회자산,BCI,ClearPoint Neuro,CLPT
# 청팀,기회자산,BCI,NeuroPace,NPCE
# 청팀,기회자산,무선 전력 전송 플랫폼,Energous Corporation,WATT
# 청팀,기회자산,대기 물 수,AirJoule Technologies Corporation,AIRJ
# 청팀,성장자산,스테이블코인/핀테크,Coinbase,COIN
# 청팀,성장자산,스테이블코인/핀테크,Robinhood,HOOD
# 청팀,성장자산,스테이블코인/핀테크,Circle,CRCL
# 청팀,성장자산,스테이블코인/핀테크,Block,XYZ
# 청팀,성장자산,스테이블코인/핀테크,MicroStrategy,MSTR
# 청팀,성장자산,스테이블코인/핀테크,Bitmine Immersion Technologies,BMNR
# 백팀,성장자산,AI,Palantir,PLTR
# 백팀,성장자산,AI,Salesforce,CRM
# 백팀,성장자산,AI,Super Micro Computer,SMCI
# 백팀,성장자산,AI,AppLovin,APP
# 백팀,성장자산,AI,Datadog,DDOG
# 백팀,성장자산,AI,Figma Inc.,FIG
# 백팀,성장자산,AI,UiPath Inc.,PATH
# 백팀,성장자산,AI,Symbotic Inc.,SYM
# 백팀,성장자산,클라우드,Nebius Group,NBIS
# 백팀,성장자산,클라우드,IREN Limited,IREN
# 백팀,성장자산,클라우드,CoreWeave,CRWV
# 백팀,성장자산,미래에너지(수소/암모니아),Bloom Energy,BE
# 백팀,성장자산,미래에너지(수소/암모니아),Plug Power,PLUG
# 백팀,성장자산,미래에너지(수소/암모니아),Air Products,APD
# 백팀,성장자산,미래에너지(수소/암모니아),Linde,LIN
# 백팀,성장자산,미래에너지(수소/암모니아),CF Industries,CF
# 백팀,성장자산,미래에너지(수소/암모니아),Ballard Power Systems,BLDP
# 백팀,성장자산,미래에너지(수소/암모니아),FuelCell Energy,FCEL
# 백팀,성장자산,미래에너지(전고체배터리),QuantumScape,QS
# 백팀,성장자산,미래에너지(전고체배터리),Solid Power,SLDP
# 백팀,성장자산,미래에너지(ESS),Fluence Energy,FLNC
# 백팀,성장자산,미래에너지(ESS),EnerSys,ENS
# 백팀,성장자산,미래에너지(ESS),Eos Energy Enterprises,EOSE
# 백팀,성장자산,미래에너지(ESS),Tesla (Energy),TSLA
# 백팀,성장자산,미래에너지(ESS),Enphase Energy,ENPH
# 백팀,성장자산,미래에너지(ESS),Eaton,ETN
# 백팀,성장자산,미래에너지(재생에너지),Duke Energy,DUK
# 백팀,성장자산,미래에너지(재생에너지),GE Vernova,GEV
# 백팀,성장자산,미래에너지(재생에너지),NextEra Energy,NEE
# 백팀,성장자산,미래에너지(재생에너지),AES Corporation,AES
# 백팀,성장자산,미래에너지(재생에너지),Constellation Energy,CEG
# 백팀,성장자산,미래에너지(재생에너지),Talen Energy Corporation,TLN
# 백팀,성장자산,미래에너지(재생에너지),American Electric Power Company,AEP
# 백팀,성장자산,미래에너지(재생에너지),Vistra Energy,VST
# 백팀,성장자산,미래에너지(재생에너지),First Solar,FSLR
# 백팀,성장자산,전통에너지,Exxon Mobil,XOM
# 백팀,성장자산,전통에너지,Chevron,CVX
# 백팀,성장자산,전통에너지,Marathon Petroleum,MPC
# 백팀,성장자산,전통에너지,Shell plc,SHEL
# 백팀,성장자산,전통에너지,ConocoPhillips,COP
# 백팀,성장자산,전통에너지,Occidental Petroleum,OXY
# 백팀,성장자산,전통에너지,Devon Energy,DVN
# 백팀,성장자산,전통에너지,Valero Energy,VLO
# 백팀,성장자산,전통에너지,Southern Company,SO
# 백팀,성장자산,데이터 인프라(냉각),Vertiv,VRT
# 백팀,성장자산,데이터 인프라(냉각),Carrier Global,CARR
# 백팀,성장자산,데이터 인프라(냉각),Honeywell International,HON
# 백팀,성장자산,데이터 인프라(냉각),Johnson Controls,JCI
# 백팀,성장자산,데이터 인프라(네트워크),Arista Networks,ANET
# 백팀,성장자산,데이터 인프라(네트워크),Credo,CRDO
# 백팀,성장자산,데이터 인프라(네트워크),Astera Labs,ALAB
# 백팀,성장자산,데이터 인프라(네트워크),Marvell Technology,MRVL
# 백팀,성장자산,데이터 인프라(네트워크),Hewlett Packard Enterprise,HPE
# 백팀,성장자산,데이터 인프라(네트워크),Cisco,CSCO
# 백팀,성장자산,데이터 인프라(네트워크),Ciena,CIEN
# 백팀,성장자산,데이터 인프라(로직반도체),NVIDIA,NVDA
# 백팀,성장자산,데이터 인프라(로직반도체),Micron Technology,MU
# 백팀,성장자산,데이터 인프라(로직반도체),AMD,AMD
# 백팀,성장자산,데이터 인프라(로직반도체),Intel,INTC
# 백팀,성장자산,데이터 인프라(로직반도체),Broadcom,AVGO
# 백팀,성장자산,데이터 인프라(로직반도체),TSMC,TSM
# 백팀,성장자산,데이터 인프라(로직반도체),Analog Devices,ADI
# 백팀,성장자산,데이터 인프라(로직반도체),Wolfspeed,WOLF
# 백팀,성장자산,데이터 인프라(로직반도체),Lam Research,LRCX
# 백팀,성장자산,데이터 인프라(로직반도체),On Semiconductor,ON
# 백팀,성장자산,데이터 인프라(로직반도체),Synopsys,SNPS
# 백팀,성장자산,데이터 인프라(하이퍼스케일),Amazon (AWS),AMZN
# 백팀,성장자산,데이터 인프라(하이퍼스케일),Microsoft (Azure),MSFT
# 백팀,성장자산,데이터 인프라(하이퍼스케일),Alphabet (GCP),GOOGL
# 백팀,성장자산,데이터 인프라(하이퍼스케일),Meta Platforms,META
# 백팀,성장자산,데이터 인프라(하이퍼스케일),Apple,AAPL
# 백팀,성장자산,데이터 인프라(하이퍼스케일),Oracle Cloud,ORCL
# 백팀,성장자산,데이터 인프라(하이퍼스케일),Pure Storage,PSTG
# 백팀,성장자산,데이터 인프라(리츠),Equinix,EQIX
# 백팀,성장자산,데이터 인프라(리츠),Digital Realty,DLR
# 백팀,성장자산,데이터 인프라(리츠),CyrusOne,CONE
# 백팀,성장자산,데이터 인프라(리츠),Continental Building Co.,CONL
# 백팀,성장자산,사이버보안,Palo Alto Networks,PANW
# 백팀,성장자산,사이버보안,CrowdStrike,CRWD
# 백팀,성장자산,사이버보안,Zscaler,ZS
# 백팀,성장자산,필수소비재,Kenvue Inc.,KVUE
# 백팀,성장자산,필수소비재,Procter & Gamble,PG
# 백팀,성장자산,필수소비재,Coca-Cola,KO
# 백팀,성장자산,필수소비재,PepsiCo,PEP
# 백팀,성장자산,필수소비재,Walmart,WMT
# 백팀,성장자산,필수소비재,Costco,COST
# 백팀,성장자산,필수소비재,Colgate-Palmolive,CL
# 백팀,성장자산,필수소비재,Kimberly-Clark,KMB
# 백팀,성장자산,필수소비재,Target Corporation,TGT
# 백팀,성장자산,필수소비재,Kraft Heinz Co,KHC
# 백팀,성장자산,필수소비재,Philip Morris Intl,PM
# 백팀,성장자산,필수소비재,Unilever PLC,UL
# 백팀,성장자산,필수소비재,Altria Group Inc,MO
# 백팀,성장자산,필수소비재,3M Company,MMM
# 백팀,성장자산,결재시스템,Visa,V
# 백팀,성장자산,결재시스템,Mastercard,MA
# 백팀,성장자산,결재시스템,American Express,AXP
# 백팀,성장자산,결재시스템,PayPal,PYPL
# 백팀,성장자산,결재시스템,Block,XYZ
# 백팀,성장자산,결재시스템,SoFi Technologies,SOFI
# 백팀,성장자산,결재시스템,Toast Inc.,TOST
# 백팀,성장자산,결재시스템,Affirm Holdings Inc.,AFRM
# 백팀,성장자산,결재시스템,Global Payments Inc.,GPN
# 백팀,성장자산,결재시스템,Zillow Group Inc.,Z
# 백팀,성장자산,금융/자산운용,BlackRock,BLK
# 백팀,성장자산,금융/자산운용,JPMorgan Chase,JPM
# 백팀,성장자산,금융/자산운용,Morgan Stanley,MS
# 백팀,성장자산,금융/자산운용,Goldman Sachs,GS
# 백팀,성장자산,금융/자산운용,Bank of America,BAC
# 백팀,성장자산,금융/자산운용,Citi Group,C
# 백팀,성장자산,금융/자산운용,HSBC Holdings,HSBC
# 백팀,성장자산,금융/자산운용,Blackstone Inc.,BX
# 백팀,성장자산,금융/자산운용,CME Group Inc.,CME
# 백팀,성장자산,금융/자산운용,Bank of New York Mellon,BK
# 백팀,성장자산,금융/자산운용,Chubb Limited,CB
# 백팀,성장자산,명품소비재,Ferrari N.V.,RACE
# 백팀,성장자산,명품소비재,Williams-Sonoma Inc.,WSM
# 백팀,성장자산,명품소비재,Tapestry,TPR
# 백팀,성장자산,명품소비재,Estée Lauder,EL
# 백팀,성장자산,명품소비재,Lululemon Athletica,LULU
# 백팀,성장자산,명품소비재,Cullen/Frost Bankers,CFR
# 백팀,성장자산,명품소비재,Old Republic Intl,OR
# 백팀,성장자산,명품소비재,LVMH Moët Hennessy Louis Vuitton,MC
# 백팀,성장자산,명품소비재,Brunswick Corporation,BC
# 백팀,성장자산,명품소비재,LVMH Moët Hennessy Louis Vuitton,LVMUY
# 백팀,성장자산,명품소비재,Ralph Lauren,RL
# 백팀,성장자산,명품소비재,Capri Holdings*,CPRI
# 백팀,성장자산,명품소비재,Canada Goose,GOOS
# 백팀,성장자산,헬스케어,UnitedHealth,UNH
# 백팀,성장자산,헬스케어,Natera,NTRA
# 백팀,성장자산,헬스케어,Johnson & Johnson,JNJ
# 백팀,성장자산,헬스케어,Thermo Fisher,TMO
# 백팀,성장자산,헬스케어,Abbott Labs,ABT
# 백팀,성장자산,헬스케어,Intuitive Surgical,ISRG
# 백팀,성장자산,헬스케어,Pfizer,PFE
# 백팀,성장자산,헬스케어,Merck & Co.,MRK
# 백팀,성장자산,헬스케어,Moderna,MRNA
# 백팀,성장자산,헬스케어,Eli Lilly,LLY
# 백팀,성장자산,물&식량,Xylem,XYL
# 백팀,성장자산,물&식량,Ecolab,ECL
# 백팀,성장자산,물&식량,American Water Works,AWK
# 백팀,성장자산,물&식량,DuPont,DD
# 백팀,성장자산,물&식량,Nestlé,NSRGY"""

#     from io import StringIO
#     # df = pd.read_csv(StringIO(data))
#     df = pd.read_csv(
#         StringIO(data),
#         on_bad_lines='skip',  # Skip problematic rows
#         engine='python'       # Use Python engine (more forgiving)
#     )
#     return df


@st.cache_data(ttl=86400)
def get_finviz_metric(ticker: str, metric_name: str):
    """
    Finviz 'snapshot-table2'에서 label 기반으로 재무지표 추출
    예: metric_name = "Debt/Eq", "Current Ratio", "ROE", "Market Cap"
    """
    try:
        url = f"https://finviz.com/quote.ashx?t={ticker}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
        res = requests.get(url, headers=headers, timeout=20)
        if res.status_code != 200:
            print(f"[{ticker}] HTTP {res.status_code}")
            return "-"

        soup = BeautifulSoup(res.text, "html.parser")
        table = soup.find("table", {"class": "snapshot-table2"})
        if table is None:
            print(f"[{ticker}] snapshot-table2 not found")
            return "-"

        cells = table.find_all("td")
        for i in range(0, len(cells) - 1, 2):
            label = cells[i].get_text(strip=True)
            value = cells[i + 1].get_text(strip=True)
            if label.lower() == metric_name.lower():
                clean = value.split("*")[0].replace("%", "").replace(",", "")
                try:
                    return float(clean)
                except ValueError:
                    return clean
        return "-"
    except Exception as e:
        print(f"[{ticker}] {metric_name} error: {e}")
        return "-"

@st.cache_data(ttl=86400)
def get_market_cap(ticker: str):
    """
    Finviz에서 시가총액 가져오기
    반환값: 문자열 (예: "150.5B", "1.2T") 또는 "-"
    """
    market_cap = get_finviz_metric(ticker, "Market Cap")
    return market_cap if market_cap != "-" else "-"

# Finviz API에서 재무제표 데이터 가져오기
@st.cache_data(ttl=86400)
def get_finviz_data(ticker, statement, item):
    try:
        statement_map = {"IS": "IQ", "BS": "BQ", "CF": "CQ"}
        statement_map = {
                      "ISQ": "IQ",  # Income Statement Quarterly
                      "BSQ": "BQ",  # Balance Sheet Quarterly
                      "CFQ": "CQ",  # Cash Flow Quarterly
                      "ISA": "IA",  # Income Statement Annual
                      "BSA": "BA",  # Balance Sheet Annual
                      "CFA": "CA"   # Cash Flow Annual
                    }
        url = f"https://finviz.com/api/statement.ashx?t={ticker}&so=F&s={statement_map[statement]}"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': f'https://finviz.com/quote.ashx?t={ticker}',
            'X-Requested-With': 'XMLHttpRequest'
        }
        
        session = requests.Session()
        response = session.get(url, headers=headers, timeout=15)
        
        if response.status_code != 200:
            print(f"[WARNING] {ticker} API HTTP {response.status_code}")
            return None
        
        time.sleep(0.01)  # Rate limiting
        
        data = response.json()

        if data and 'data' in data and item in data['data']:
            values = data['data'][item]
            if values and len(values) > 0:
                value = values[0]
                if value == '-' or value is None:
                    return None
                try:
                    return float(value)
                except:
                    return None
        
        return None
        
    except requests.exceptions.Timeout:
        print(f"[WARNING] {ticker} API Timeout")
        return None
    except Exception as e:
        print(f"[WARNING] {ticker} API 조회 실패: {e}")
        return None

# 주가 데이터 가져오기 (Yahoo Finance Chart API - Google Apps Script 방식)
@st.cache_data(ttl=3600)
def get_stock_data(ticker, start_date, end_date):
    if isinstance(start_date, str):
        start_date = datetime.strptime(start_date, '%Y-%m-%d')
    else:
        start_date = datetime.combine(start_date, datetime.min.time())

    if isinstance(end_date, str):
        end_date = datetime.strptime(end_date, '%Y-%m-%d')
    else:
        end_date = datetime.combine(end_date, datetime.min.time())

    try:
        start_timestamp = int(start_date.replace(hour=0, minute=0, second=0, microsecond=0).timestamp())
        end_timestamp = int(end_date.replace(hour=23, minute=59, second=59, microsecond=999000).timestamp())

        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
        params = {'period1': start_timestamp, 'period2': end_timestamp, 'interval': '1d'}
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

        response = requests.get(url, params=params, headers=headers, timeout=20)
        if response.status_code != 200:
            print(f"HTTP {response.status_code} for {ticker}")
            return None

        data = response.json()
        if not data.get('chart') or not data['chart'].get('result') or len(data['chart']['result']) == 0:
            print(f"Invalid API response for {ticker}")
            return None

        result = data['chart']['result'][0]
        timestamps = result.get('timestamp', [])
        if not timestamps:
            print(f"No timestamps for {ticker}")
            return None

        indicators_list = result.get('indicators', {}).get('quote', [])
        if not indicators_list or len(indicators_list) == 0:
            print(f"No indicators for {ticker}")
            return None

        indicators = indicators_list[0]
        opens = indicators.get('open', [])
        highs = indicators.get('high', [])
        lows = indicators.get('low', [])
        closes = indicators.get('close', [])
        volumes = indicators.get('volume', [])

        data_list = []
        for i in range(len(timestamps)):
            if (closes[i] is not None and opens[i] is not None and highs[i] is not None and lows[i] is not None):
                date = datetime.fromtimestamp(timestamps[i])
                data_list.append({
                    'Date': date,
                    'Open': float(opens[i]),
                    'High': float(highs[i]),
                    'Low': float(lows[i]),
                    'Close': float(closes[i]),
                    'Volume': int(volumes[i]) if volumes[i] is not None else 0
                })

        if not data_list:
            print(f"No valid data for {ticker}")
            return None

        df = pd.DataFrame(data_list)
        df = df.set_index('Date')
        df = df.sort_index()
        return df

    except Exception as e:
        print(f"Error fetching data for {ticker}: {e}")
        return None

# 이동평균선이 포함된 주가 데이터 가져오기 (최근 1년 6개월)
@st.cache_data(ttl=3600)
def get_stock_data_with_ma(ticker, interval="1d"):
    """최근 1년 6개월 데이터를 가져오고 이동평균선 계산"""
    try:
        import yfinance as yf
        
        # 기간 설정 - 이동평균선 계산을 위해 충분한 데이터 필요
        if interval == "1d":
            period = "3y"  # 일봉: 3년치 데이터
            ma_periods = [200, 240, 365]
            display_days = 547  # 1년 6개월
        else:  # 1wk
            period = "10y"  # 주봉: 10년치 데이터 (충분한 데이터 확보)
            ma_periods = [200, 240, 365]
            display_weeks = 78  # 1년 6개월
        
        yf_ticker = yf.Ticker(ticker)
        df = yf_ticker.history(period=period, interval=interval)
        
        if df is None or df.empty:
            # period로 실패하면 max로 시도
            df = yf_ticker.history(period="max", interval=interval)
        
        if df is None or df.empty:
            return None
        
        df = df[["Open", "High", "Low", "Close", "Volume"]].copy()
        
        # 이동평균선 계산
        for ma_period in ma_periods:
            df[f"MA{ma_period}"] = df["Close"].rolling(ma_period).mean()
        df.dropna(inplace=True)

        df_display = df
        
        return df_display if not df_display.empty else None
        
    except Exception as e:
        print(f"Error fetching data with MA for {ticker}: {e}")
        return None

# -----------------------------
# 색상 강조 함수
# -----------------------------
def highlight_positive_negative(val):
    try:
        v = float(val)
        if v > 0: return "color: green"
        elif v < 0: return "color: red"
    except:
        return ""
    return ""

def highlight_low_debt_ratio(val):
    try:
        v = float(val)
        if v <= 30: return "background-color: lightgreen"
    except:
        return ""
    return ""

def highlight_market_cap(val):
    """시가총액이 100B 이하면 녹색으로 표시"""
    try:
        if isinstance(val, str) and val != "-":
            # "150.5B", "1.2T" 같은 형식 파싱
            val_str = val.strip()
            if val_str.endswith('T'):
                # Trillion은 항상 100B 초과
                return ""
            elif val_str.endswith('B'):
                num = float(val_str[:-1])
                if num <= 100:
                    return "background-color: lightgreen"
            elif val_str.endswith('M'):
                # Million은 항상 100B 미만
                return "background-color: lightgreen"
    except:
        return ""
    return ""

# 개별 종목 차트 표시 함수
def display_stock_chart(selected_data, start_date):
    """선택된 종목의 상세 차트를 표시"""
    if selected_data['price_data'] is not None:
        st.markdown("---")
        st.subheader(f"📈 {selected_data['기업명']} ({selected_data['티커']}) 상세 차트")
        
        col1, col2, col3, col4 = st.columns(4)

        with col1:
            st.metric("현재가", f"${selected_data['현재가']}", f"{selected_data['일일수익률']}%")

        with col2:
            st.metric("누적수익률 (기준가)", f"{selected_data['누적수익률(기준가)']}%")

        with col3:
            st.metric("누적수익률 (최고가)", f"{selected_data['누적수익률(최고가)']}%")
            
        with col4:
            st.metric("섹터", selected_data['섹터'])

        # 차트 주기 선택
        chart_interval = st.radio(
            "차트 주기",
            ["일봉 (1d)", "주봉 (1wk)"],
            horizontal=True,
            key=f"interval_{selected_data['티커']}"
        )
        
        interval = "1d" if "일봉" in chart_interval else "1wk"
        
        # 이동평균선이 포함된 데이터 가져오기
        df_chart = get_stock_data_with_ma(selected_data['티커'], interval)
        
        if df_chart is not None and not df_chart.empty:
            # 캔들스틱 차트 생성
            fig_price = go.Figure()
            
            # 박스 줌 활성화
            fig_price.update_layout(
                dragmode="zoom",
                xaxis_rangeslider_visible=False
            )
            
            # 캔들스틱 추가
            fig_price.add_trace(go.Candlestick(
                x=df_chart.index,
                open=df_chart["Open"],
                high=df_chart["High"],
                low=df_chart["Low"],
                close=df_chart["Close"],
                name="주가"
            ))
            
            # 이동평균선 추가
            ma_colors = {
                "MA200": "#7752fe",
                "MA240": "#f97316",
                "MA365": "#6b7280"
            }
            
            for ma_name, color in ma_colors.items():
                if ma_name in df_chart.columns:
                    fig_price.add_trace(go.Scatter(
                        x=df_chart.index,
                        y=df_chart[ma_name],
                        mode="lines",
                        name=ma_name,
                        line=dict(width=2, color=color)
                    ))
            
            # 시작일 세로선 추가
            if start_date:
                # start_date를 datetime으로 변환
                if isinstance(start_date, str):
                    start_dt = pd.to_datetime(start_date)
                else:
                    start_dt = pd.to_datetime(start_date)
                
                # 타임존 정보 맞추기
                if df_chart.index.tz is not None:
                    if start_dt.tz is None:
                        start_dt = start_dt.tz_localize(df_chart.index.tz)
                else:
                    if start_dt.tz is not None:
                        start_dt = start_dt.tz_localize(None)
                
                # 차트 데이터 범위 내에 있는지 확인
                try:
                    if df_chart.index[0] <= start_dt <= df_chart.index[-1]:
                        fig_price.add_vline(
                            x=start_dt,
                            line_dash="dash",
                            line_color="red",
                            annotation_text="시작일",
                            annotation_position="top"
                        )
                except:
                    pass  # 비교 실패 시 무시
            
            fig_price.update_layout(
                title=f"주가 트렌드 ({chart_interval})",
                xaxis_title="날짜",
                yaxis_title="가격 ($)",
                height=int(500 * SCALE),
                hovermode='x unified',
                showlegend=True,
                legend=dict(
                    orientation="h",
                    yanchor="bottom",
                    y=1.02,
                    xanchor="right",
                    x=1
                )
            )
            
            st.plotly_chart(fig_price, use_container_width=True)
        else:
            st.warning("차트 데이터를 불러올 수 없습니다.")

        # 기존 변동률 및 누적수익률 차트 유지
        col1, col2 = st.columns(2)

        with col1:
            if selected_data['daily_changes'] is not None:
                changes = selected_data['daily_changes'].dropna()
                colors = ['green' if x >= 0 else 'red' for x in changes]

                fig_change = go.Figure()
                fig_change.add_trace(go.Bar(
                    x=changes.index,
                    y=changes.values,
                    marker_color=colors,
                    name='일일 변동률'
                ))
                fig_change.update_layout(
                    title="변동률 트렌드",
                    xaxis_title="날짜",
                    yaxis_title="변동률 (%)",
                    height=int(400 * SCALE),
                    showlegend=False
                )
                fig_change.add_hline(y=0, line_dash="dash", line_color="gray")
                
                # 시작일 세로선 추가
                if start_date:
                    if isinstance(start_date, str):
                        start_dt = pd.to_datetime(start_date)
                    else:
                        start_dt = pd.to_datetime(start_date)
                    
                    # 타임존 정보 맞추기
                    if changes.index.tz is not None:
                        if start_dt.tz is None:
                            start_dt = start_dt.tz_localize(changes.index.tz)
                    else:
                        if start_dt.tz is not None:
                            start_dt = start_dt.tz_localize(None)
                    
                    try:
                        if changes.index[0] <= start_dt <= changes.index[-1]:
                            fig_change.add_vline(
                                x=start_dt,
                                line_dash="dash",
                                line_color="red"
                            )
                    except:
                        pass
                
                st.plotly_chart(fig_change, use_container_width=True)

        with col2:
            if selected_data['cumulative_returns'] is not None:
                returns = selected_data['cumulative_returns'].dropna()
                colors = ['green' if x >= 0 else 'red' for x in returns]

                fig_return = go.Figure()
                fig_return.add_trace(go.Bar(
                    x=returns.index,
                    y=returns.values,
                    marker_color=colors,
                    name='누적 수익률'
                ))
                fig_return.update_layout(
                    title="누적 수익률 트렌드",
                    xaxis_title="날짜",
                    yaxis_title="누적 수익률 (%)",
                    height=int(400 * SCALE),
                    showlegend=False
                )
                fig_return.add_hline(y=0, line_dash="dash", line_color="gray")
                
                # 시작일 세로선 추가
                if start_date:
                    if isinstance(start_date, str):
                        start_dt = pd.to_datetime(start_date)
                    else:
                        start_dt = pd.to_datetime(start_date)
                    
                    # 타임존 정보 맞추기
                    if returns.index.tz is not None:
                        if start_dt.tz is None:
                            start_dt = start_dt.tz_localize(returns.index.tz)
                    else:
                        if start_dt.tz is not None:
                            start_dt = start_dt.tz_localize(None)
                    
                    try:
                        if returns.index[0] <= start_dt <= returns.index[-1]:
                            fig_return.add_vline(
                                x=start_dt,
                                line_dash="dash",
                                line_color="red"
                            )
                    except:
                        pass
                
                st.plotly_chart(fig_return, use_container_width=True)

# 메인 앱
def main():
    st.title("📊 투자 포트폴리오 대시보드")

    st.sidebar.header("⚙️ 설정")

    # 날짜 설정을 2열로 배치
    st.sidebar.subheader("📅 날짜 범위")
    default_start = datetime(2025, 10, 9)
    default_end = datetime.now()

    col1, col2 = st.sidebar.columns(2)
    with col1:
        start_date = st.date_input("시작일", default_start, key="start")
    with col2:
        end_date = st.date_input("종료일", default_end, key="end")

    # 변동율 Y축 범위를 2열로 배치
    st.sidebar.subheader("📊 변동율 Y축")
    col1, col2 = st.sidebar.columns(2)
    with col1:
        change_y_min = st.number_input("최소값", value=-10, key="change_min")
    with col2:
        change_y_max = st.number_input("최대값", value=10, key="change_max")

    # 누적수익율 Y축 범위를 2열로 배치
    st.sidebar.subheader("📈 누적수익율 Y축")
    col1, col2 = st.sidebar.columns(2)
    with col1:
        return_y_min = st.number_input("최소값", value=-50, key="return_min")
    with col2:
        return_y_max = st.number_input("최대값", value=50, key="return_max")

    analyze_button = st.sidebar.button("🔍 분석 시작", type="primary", use_container_width=True)

    portfolio_df = load_portfolio_data()

    tab1, tab2, tab3 = st.tabs(["📈 포트폴리오 분석", "📊 트렌드 분석", "🔥 일일변동률 히트맵"])

    with tab1:
        if analyze_button or 'results' in st.session_state:
            if analyze_button:
                st.info("데이터를 가져오는 중... 시간이 걸릴 수 있습니다.")
                results = []
                progress_bar = st.progress(0)

                for idx, row in portfolio_df.iterrows():
                    ticker = row['티커']
                    progress_bar.progress((idx + 1) / len(portfolio_df))
                    stock_data = get_stock_data(ticker, start_date, end_date)
                    
                    # 시가총액 가져오기
                    market_cap = get_market_cap(ticker)

                    if stock_data is not None and len(stock_data) > 0:
                        base_price = stock_data['Close'].iloc[0]
                        current_price = stock_data['Close'].iloc[-1]
                        highest_price = stock_data['Close'].max()

                        return_from_base = ((current_price - base_price) / base_price) * 100
                        return_from_high = ((current_price - highest_price) / highest_price) * 100

                        if len(stock_data) > 1:
                            daily_return = current_price - stock_data['Close'].iloc[-2]
                            daily_return_pct = ((current_price - stock_data['Close'].iloc[-2]) / stock_data['Close'].iloc[-2]) * 100
                        else:
                            daily_return = 0
                            daily_return_pct = 0

                        daily_changes = stock_data['Close'].pct_change() * 100
                        cumulative_returns = ((stock_data['Close'] / base_price) - 1) * 100

                        # Finviz에서 재무 데이터 가져오기
                        debt_ratio = get_finviz_metric(ticker, "Debt/Eq") * 100
                        current_ratio = get_finviz_metric(ticker, "Current Ratio") * 100
                        roe = get_finviz_metric(ticker, "ROE")
                        total_cash = get_finviz_data(ticker, "BSQ", "Cash & Short Term Investments")
                        free_cash_flow = get_finviz_data(ticker, "CFA", "Free Cash Flow")

                        runway = "-"
                        if total_cash and free_cash_flow and free_cash_flow < 0:
                            runway = round(total_cash / abs(free_cash_flow), 1)

                        results.append({
                            '팀': row['팀'],
                            '자산': row['자산'],
                            '섹터': row['섹터'],
                            '기업명': row['기업명'],
                            '티커': ticker,
                            '시가총액': market_cap,
                            '기준가': round(base_price, 2),
                            '최고가': round(highest_price, 2),
                            '현재가': round(current_price, 2),
                            '누적수익률(기준가)': round(return_from_base, 2),
                            '누적수익률(최고가)': round(return_from_high, 2),
                            '일일수익': round(daily_return, 2),
                            '일일수익률': round(daily_return_pct, 2),
                            '부채비율': round(debt_ratio, 2) if isinstance(debt_ratio, (int, float)) else "-",
                            '유동비율': round(current_ratio, 2) if isinstance(current_ratio, (int, float)) else "-",
                            'ROE': round(roe, 2) if isinstance(roe, (int, float)) else "-",
                            'Runway(년)': runway,
                            'Total Cash(M$)': round(total_cash, 2) if total_cash else "-",
                            'FCF(M$)': round(free_cash_flow, 2) if free_cash_flow else "-",
                            'price_data': stock_data,
                            'daily_changes': daily_changes[1:],
                            'cumulative_returns': cumulative_returns
                        })
                    else:
                        results.append({
                            '팀': row['팀'],
                            '자산': row['자산'],
                            '섹터': row['섹터'],
                            '기업명': row['기업명'],
                            '티커': ticker,
                            '시가총액': market_cap,
                            '기준가': "-",
                            '최고가': "-",
                            '현재가': "-",
                            '누적수익률(기준가)': "-",
                            '누적수익률(최고가)': "-",
                            '일일수익': "-",
                            '일일수익률': "-",
                            '부채비율': "-",
                            '유동비율': "-",
                            'ROE': "-",
                            'Runway(년)': "-",
                            'Total Cash(M$)': "-",
                            'FCF(M$)': "-",
                            'price_data': None,
                            'daily_changes': None,
                            'cumulative_returns': None
                        })

                progress_bar.empty()
                st.success("✅ 분석 완료!")

                st.session_state['results'] = results
                st.session_state['result_df'] = pd.DataFrame(results)

            else:
                results = st.session_state['results']
                result_df = st.session_state['result_df']

            st.subheader("포트폴리오 상세 분석")

            display_columns = ['팀', '자산', '섹터', '기업명', '티커', '시가총액', '기준가', '최고가', '현재가',
                               '누적수익률(기준가)', '누적수익률(최고가)', '일일수익', '일일수익률',
                               '부채비율', '유동비율', 'ROE', 'Runway(년)', 'Total Cash(M$)', 'FCF(M$)']

            def highlight_returns(val):
                if isinstance(val, (int, float)):
                    color = 'green' if val >= 0 else 'red'
                    return f'color: {color}'
                return ''

            # 표시용 DataFrame 생성
            display_df = st.session_state['result_df'][display_columns].copy()
            
            # Finviz 링크 컬럼 추가
            display_df['Finviz'] = display_df['티커'].apply(
                lambda ticker: f"https://finviz.com/quote.ashx?t={ticker}&p=d"
            )
            
            # 숫자 컬럼 포맷팅 (소수점 2자리) - 시가총액 제외
            float_cols = [
                '기준가', '최고가', '현재가',
                '누적수익률(기준가)', '누적수익률(최고가)', '일일수익', '일일수익률',
                '부채비율', '유동비율', 'ROE', 'Runway(년)', 'Total Cash(M$)', 'FCF(M$)'
            ]

            for col in float_cols:
                display_df[col] = display_df[col].apply(
                    lambda x: f"{x:.2f}" if isinstance(x, (int, float)) else x
                )

            
            
            # 단일 선택을 위한 체크박스 컬럼 추가
            display_df.insert(0, '선택', False)

            # 번호 컬럼 추가
            display_df.insert(1, '번호', range(1, len(display_df) + 1))

            

            
            
            
            # 이전 선택 상태 복원 (session_state에 저장)
            if 'selected_ticker' in st.session_state and st.session_state.selected_ticker:
                ticker_idx = display_df[display_df['티커'] == st.session_state.selected_ticker].index
                if len(ticker_idx) > 0:
                    display_df.loc[ticker_idx[0], '선택'] = True

            # 스타일 적용
            display_df = (
                display_df.style
                .map(highlight_positive_negative,
                     subset=["누적수익률(기준가)", "누적수익률(최고가)", "일일수익", "일일수익률", "ROE"])
                .map(highlight_low_debt_ratio, subset=["부채비율"])
                .map(highlight_market_cap, subset=["시가총액"])
            )
            
            # 테이블 표시 (편집 가능)
            edited_df = st.data_editor(
                display_df,
                use_container_width=True,
                height=int(600 * SCALE),
                hide_index=True,
                column_config={
                    "번호": st.column_config.NumberColumn(
                        "번호",
                        help="종목 순번",
                        width="small",
                        disabled=True
                    ),
                    "선택": st.column_config.CheckboxColumn(
                        "선택",
                        help="차트를 보고 싶은 종목을 선택하세요 (단일 선택)",
                        default=False,
                    ),
                    "Finviz": st.column_config.LinkColumn(
                        "Finviz",
                        help="Finviz 차트 보기",
                        width="small"
                    )
                },
                disabled=[col for col in display_df.columns if col not in ['선택']],
                key='stock_table'
            )

            # 선택된 종목 확인
            selected_rows = edited_df[edited_df['선택'] == True]
            
            # 단일 선택 로직 처리
            if len(selected_rows) > 1:
                # 여러 개 선택된 경우, 가장 최근 선택만 유지
                # 이전 선택과 비교하여 새로 선택된 것만 남김
                prev_selected = st.session_state.get('selected_ticker', None)
                new_selected = None
                
                for idx, row in selected_rows.iterrows():
                    if row['티커'] != prev_selected:
                        new_selected = row['티커']
                        break
                
                if new_selected is None:
                    new_selected = selected_rows.iloc[-1]['티커']
                
                st.session_state.selected_ticker = new_selected
                st.rerun()
                
            elif len(selected_rows) == 1:
                # 단일 선택된 경우
                st.session_state.selected_ticker = selected_rows.iloc[0]['티커']
                selected_row = selected_rows.iloc[0]
            else:
                # 선택 해제된 경우
                if 'selected_ticker' in st.session_state:
                    del st.session_state.selected_ticker
                selected_row = None

            
            
            # 차트 표시
            if len(selected_rows) == 1:
                st.markdown("---")
                selected_ticker = selected_row['티커']
                selected_data = st.session_state['result_df'][
                    st.session_state['result_df']['티커'] == selected_ticker
                ].iloc[0]
                
                display_stock_chart(selected_data, start_date)
            elif len(selected_rows) == 0:
                st.info("💡 차트를 보려면 테이블에서 종목의 체크박스를 선택하세요.")

        else:
            st.info("분석을 실행해주세요.")

    with tab2:
        if 'results' in st.session_state:
            results = st.session_state['results']
            result_df = st.session_state['result_df']

            st.subheader("📊 트렌드 분석")

            st.markdown("### 1️⃣ 청팀 vs 백팀 누적수익률 비교 (가중평균 포함)")
            team_returns = {}
            for team in result_df['팀'].unique():
                stocks = result_df[result_df['팀'] == team]
                arr = [r['cumulative_returns'].dropna() for _, r in stocks.iterrows() if r['cumulative_returns'] is not None]
                if arr:
                    team_returns[team] = pd.concat(arr, axis=1).mean(axis=1)
            if team_returns:
                total = sum(len(result_df[result_df['팀'] == t]) for t in team_returns.keys())
                weighted = {t: d * (len(result_df[result_df['팀'] == t]) / total) for t, d in team_returns.items()}
                total_weighted = sum(weighted.values())

                fig = go.Figure()
                for t, d in team_returns.items():
                    fig.add_trace(go.Scatter(x=d.index, y=d.values, mode='lines', name=f"{t} 평균"))
                fig.add_trace(go.Scatter(x=total_weighted.index, y=total_weighted.values,
                                         mode='lines', name="시장 전체 가중평균",
                                         line=dict(width=max(int(3 * SCALE), 1), dash='dot', color='red')))
                fig.update_layout(title="청팀 vs 백팀 누적수익률 비교 (가중평균 포함)",
                                  height=int(500 * SCALE),
                                  hovermode='x unified')
                fig.add_hline(y=0, line_dash="dash", line_color="gray")
                st.plotly_chart(fig, use_container_width=True)

            team_data = {}
            for team in result_df['팀'].unique():
                team_stocks = result_df[result_df['팀'] == team]
                all_changes = []

                for idx, row in team_stocks.iterrows():
                    if row['daily_changes'] is not None:
                        all_changes.append(row['daily_changes'].dropna())

                if all_changes:
                    combined = pd.concat(all_changes, axis=1)
                    team_avg = combined.mean(axis=1)
                    team_data[team] = team_avg

            if team_data:
                fig_team = go.Figure()
                for team, data in team_data.items():
                    fig_team.add_trace(go.Scatter(
                        x=data.index,
                        y=data.values,
                        mode='lines',
                        name=team,
                        line=dict(width=max(int(2 * SCALE), 1))
                    ))

                fig_team.update_layout(
                    title="청팀 vs 백팀 평균 변동률 비교",
                    xaxis_title="날짜",
                    yaxis_title="평균 변동률 (%)",
                    height=int(500 * SCALE),
                    hovermode='x unified',
                    legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
                )
                fig_team.add_hline(y=0, line_dash="dash", line_color="gray")
                st.plotly_chart(fig_team, use_container_width=True)

            st.markdown("### 2️⃣ 섹터별 평균 누적변동률 트렌드")

            sector_data = {}
            for sector in result_df['섹터'].unique():
                sector_stocks = result_df[result_df['섹터'] == sector]
                all_changes = []

                for idx, row in sector_stocks.iterrows():
                    if row['cumulative_returns'] is not None:
                        all_changes.append(row['cumulative_returns'].dropna())

                if all_changes:
                    combined = pd.concat(all_changes, axis=1)
                    sector_avg = combined.mean(axis=1)
                    sector_data[sector] = sector_avg

            if sector_data:
                fig_sector = go.Figure()
                for sector, data in sector_data.items():
                    fig_sector.add_trace(go.Scatter(
                        x=data.index,
                        y=data.values,
                        mode='lines',
                        name=sector,
                        line=dict(width=max(int(2 * SCALE), 1))
                    ))

                fig_sector.update_layout(
                    title="섹터별 평균 누적변동률 비교",
                    xaxis_title="날짜",
                    yaxis_title="평균 누적변동률 (%)",
                    height=int(1000 * SCALE),
                    hovermode='x unified',
                    legend=dict(orientation="v", yanchor="top", y=1, xanchor="left", x=1.02)
                )
                fig_sector.add_hline(y=0, line_dash="dash", line_color="gray")
                st.plotly_chart(fig_sector, use_container_width=True)

            st.markdown("### 3️⃣ 섹터별 개별 종목 누적변동률")

            sectors = result_df['섹터'].unique()

            for sector in sectors:
                with st.expander(f"📂 {sector}"):
                    sector_stocks = result_df[result_df['섹터'] == sector]

                    n_stocks = len(sector_stocks)
                    if n_stocks == 0:
                        continue

                    cols = 5
                    rows = (n_stocks + cols - 1) // cols

                    # 기업명(티커) 형태로 subtitle 생성
                    subtitles = [f"{row['기업명']}({row['티커']})" for _, row in sector_stocks.iterrows()]

                    fig = make_subplots(
                        rows=rows,
                        cols=cols,
                        subplot_titles=subtitles,
                        vertical_spacing=0.15 * SCALE,  # 행 간격 증가
                        horizontal_spacing=0.03 * SCALE
                    )

                    for idx, (_, row) in enumerate(sector_stocks.iterrows()):
                        if row['cumulative_returns'] is not None:
                            changes = row['cumulative_returns'].dropna()
                            colors = ['green' if x >= 0 else 'red' for x in changes]

                            row_num = (idx // cols) + 1
                            col_num = (idx % cols) + 1

                            fig.add_trace(
                                go.Bar(
                                    x=changes.index,
                                    y=changes.values,
                                    marker_color=colors,
                                    showlegend=False,
                                    name=row['티커'],
                                ),
                                row=row_num,
                                col=col_num
                            )
                            fig.update_yaxes(range=[return_y_min, return_y_max], row=row_num, col=col_num)

                    # 전체 레이아웃 설정
                    fig.update_layout(
                        height=int(350 * rows * SCALE),  # 행 간격을 위해 높이 약간 증가
                        title_text=f"{sector} 섹터 누적변동률",
                        showlegend=False,
                    )

                    # 모든 subplot의 폰트 크기 축소
                    fig.update_xaxes(title_font=dict(size=8), tickfont=dict(size=7))
                    fig.update_yaxes(title_font=dict(size=8), tickfont=dict(size=7))
                    fig.update_annotations(font_size=9)  # subplot 제목 크기

                    # 0선 추가
                    for i in range(1, rows + 1):
                        for j in range(1, cols + 1):
                            fig.add_hline(
                                y=0,
                                line_dash="dash",
                                line_color="gray",
                                row=i,
                                col=j
                            )

                    st.plotly_chart(fig, use_container_width=True)

        else:
            st.info("먼저 '포트폴리오 분석' 탭에서 분석을 실행해주세요.")

    with tab3:
        if 'results' in st.session_state:
            results = st.session_state['results']
            result_df = st.session_state['result_df']

            st.subheader("🔥 변동률 히트맵")
            
            # 히트맵 타입 선택
            heatmap_type = st.radio(
                "히트맵 유형",
                ["누적변동률", "일일변동률"],
                horizontal=True,
                key="heatmap_type"
            )
            
            # 필터 옵션
            col1, col2 = st.columns([1, 3])
            with col1:
                filter_option = st.selectbox(
                    "필터",
                    ["전체", "팀별", "섹터별"],
                    key="heatmap_filter"
                )
            
            with col2:
                if filter_option == "팀별":
                    selected_teams = st.multiselect(
                        "팀 선택",
                        options=result_df['팀'].unique(),
                        default=result_df['팀'].unique(),
                        key="team_filter"
                    )
                    filtered_df = result_df[result_df['팀'].isin(selected_teams)]
                elif filter_option == "섹터별":
                    selected_sectors = st.multiselect(
                        "섹터 선택",
                        options=result_df['섹터'].unique(),
                        default=result_df['섹터'].unique(),
                        key="sector_filter"
                    )
                    filtered_df = result_df[result_df['섹터'].isin(selected_sectors)]
                else:
                    filtered_df = result_df

            # 데이터 수집 (선택된 히트맵 타입에 따라)
            heatmap_data = []
            stock_labels = []
            
            if heatmap_type == "일일변동률":
                data_column = 'daily_changes'
                title_text = "일일변동률 히트맵 (시작일~종료일)"
                metric_label = "일일변동률"
            else:  # 누적변동률
                data_column = 'cumulative_returns'
                title_text = "누적변동률 히트맵 (시작일~종료일)"
                metric_label = "누적변동률"
            
            # 원본 순서대로 데이터 수집
            for idx, row in filtered_df.iterrows():
                if row[data_column] is not None and not row[data_column].empty:
                    stock_label = f"{row['기업명']}({row['티커']})"
                    stock_labels.append(stock_label)
                    heatmap_data.append(row[data_column].values)
            
            if heatmap_data:
                # 데이터프레임으로 변환
                # 모든 종목의 날짜를 통합
                all_dates = filtered_df[filtered_df[data_column].notna()][data_column].iloc[0].index
                
                heatmap_df = pd.DataFrame(heatmap_data, index=stock_labels)
                heatmap_df.columns = all_dates
                
                # y축 순서를 반대로 (위에서 아래로)
                heatmap_df = heatmap_df.iloc[::-1]
                
                # 히트맵 생성
                fig_heatmap = go.Figure(data=go.Heatmap(
                    z=heatmap_df.values,
                    x=[d.strftime('%Y-%m-%d') for d in heatmap_df.columns],
                    y=heatmap_df.index,
                    colorscale=[
                        [0, '#d32f2f'],      # 진한 빨강 (큰 음수)
                        [0.4, '#ffcdd2'],    # 연한 빨강
                        [0.5, '#ffffff'],    # 흰색 (0)
                        [0.6, '#c8e6c9'],    # 연한 초록
                        [1, '#388e3c']       # 진한 초록 (큰 양수)
                    ],
                    zmid=0,
                    colorbar=dict(title="변동률 (%)"),
                    hovertemplate='%{y}<br>날짜: %{x}<br>변동률: %{z:.2f}%<extra></extra>'
                ))
                
                fig_heatmap.update_layout(
                    title=title_text,
                    xaxis_title="날짜",
                    yaxis_title="종목",
                    height=max(int(400 * SCALE), len(stock_labels) * 25),
                    xaxis=dict(
                        tickangle=-45,
                        tickmode='auto',
                        nticks=20
                    ),
                    yaxis=dict(
                        tickmode='linear',
                        automargin=True
                    )
                )
                
                st.plotly_chart(fig_heatmap, use_container_width=True)
                
                # 통계 정보 표시
                st.markdown("### 📊 히트맵 통계")
                col1, col2, col3, col4 = st.columns(4)
                
                with col1:
                    avg_change = heatmap_df.values.flatten().mean()
                    st.metric(f"평균 {metric_label}", f"{avg_change:.2f}%")
                
                with col2:
                    max_change = heatmap_df.values.flatten().max()
                    st.metric("최대 상승률", f"{max_change:.2f}%")
                
                with col3:
                    min_change = heatmap_df.values.flatten().min()
                    st.metric("최대 하락률", f"{min_change:.2f}%")
                
                with col4:
                    volatility = heatmap_df.values.flatten().std()
                    st.metric("변동성 (표준편차)", f"{volatility:.2f}%")
                
            else:
                st.warning("선택된 필터에 해당하는 데이터가 없습니다.")
        
        else:
            st.info("먼저 '포트폴리오 분석' 탭에서 분석을 실행해주세요.")


if __name__ == "__main__":
    main()
