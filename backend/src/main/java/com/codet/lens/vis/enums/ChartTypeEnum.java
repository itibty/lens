package com.codet.lens.vis.enums;

import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.Getter;

/** 图表类型。PIVOT 只能走透视接口，其余走普通查询。 */
@Getter
public enum ChartTypeEnum {

    BAR("bar", "柱状图"),
    LINE("line", "折线图"),
    COMBO("combo", "柱线复合图"),
    PIE("pie", "饼图"),
    SCATTER("scatter", "散点图"),
    TABLE("table", "表格"),
    NUMBER("number", "数字卡片"),
    PIVOT("pivot", "透视表"),
    FUNNEL("funnel", "漏斗图"),
    WORD_CLOUD("wordcloud", "词云"),
    RADAR("radar", "雷达图"),
    RICH_TEXT("richtext", "富文本"),
    URL("url", "网页"),
    PROGRESS("progress", "进度条"),
    KPI("kpi", "KPI图"),
    HEATMAP("heatmap", "热力图"),
    TREEMAP("treemap", "矩形树图"),
    WATERFALL("waterfall", "瀑布图"),
    TREND("trend", "趋势指标卡"),
    TORNADO("tornado", "对比条"),
    RANK("rank", "排行榜");

    private static final Map<String, ChartTypeEnum> BY_CODE = Arrays.stream(values())
            .collect(Collectors.toMap(item -> item.code, item -> item));

    private final String code;
    private final String name;

    ChartTypeEnum(String code, String name) {
        this.code = code;
        this.name = name;
    }

    /** 富文本 / 网页不查数，保存时可不配数据集。 */
    public boolean needsDataset() {
        return this != RICH_TEXT && this != URL;
    }

    /** 只认 code 精确匹配，如 combo；不认 COMBO / Combo */
    public static ChartTypeEnum of(String raw) {
        return raw == null || raw.isEmpty() ? null : BY_CODE.get(raw);
    }
}
