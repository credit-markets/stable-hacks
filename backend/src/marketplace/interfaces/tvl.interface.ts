export interface TVLDayData {
  id: string;
  tvl: string;
  timestamp: string;
}

export interface TVLResponse {
  tvldayDatas: TVLDayData[];
  totalTVL: string;
}
