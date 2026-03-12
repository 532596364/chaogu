//
export type TypeOfBiddingItem = {
    // id 
    id: string;
    // 代码
    code: string;
    // 名称
    name: string;
    // 异动类型
    type: string;
    // 异动说明
    desc: string;
    // 竞价评级
    bidding_rate: string;
    // 匹配价
    match_price: number;
    // 竞价涨幅
    bidding_amount_of_increase: number;
    // 竞价量
    bidding_quantity: number;
    // 竞价金额
    bidding_money: number;
    // 未匹配量
    unmatch_quantity: number;
    // 未匹配金额
    unmatch_money: number;
    // 昨日成交量
    yesterday_quantity: number;
    // 昨日换手
    yesterday_change_hands: number;
    // 换手
    change_hands: number;
    // 昨收
    yesterday_close_pirce: number;
    // 现价
    current_price: number;
    // 涨幅
    amount_of_increase: number;
    // 总手
    total_volume: number;
    // 金额
    money: number;
    // 量比
    quantity_relative_ratio: number;
    // 创建时间
    create_time: string;
}

export type TypeTemperature = {   
    // 5天连续抢筹的数量
    nums_of_5_days: number;
    // 4天连续抢筹的数量
    nums_of_4_days: number;
    // 3天连续抢筹的数量
    nums_of_3_days: number;
    // 2天连续抢筹的数量
    nums_of_2_days: number;
    // 1天连续抢筹的数量
    nums_of_1_days: number;
    // 当天触发竞价抢筹的数量
    nums_of_jingjia: number;
    // 当天竞价中，涨停的数量
    nums_of_up_stop: number;
    // 市场连扳高度
    stop_height: number;
    // 情绪温度
    emotional_temperature: number;
    // 猜测温度
    guess_temperature: number;
    // 创建日期
    create_date: string;
}


export type TypeFivedaysItems = {
    // 股票名称
    name: string;
    // 股票代码
    code: string;
    // 筛选出来的时间
    filter_date: string;
    // 隔日正负
    next_day_sign: string;
    // 隔三日正负
    three_days_sign: string;
    // 隔五日正负
    five_days_sign: string;
    // 隔十日正负
    ten_days_sign: string;
    // 隔二十日正负
    twenty_days_sign: string;
    // 隔四十日正负
    forty_days_sign: string;
}