package com.codet.lens.vis.core.query;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.codet.lens.vis.dto.item.FilterItem;
import java.time.LocalDate;
import java.util.*;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * 数据集条件（params）合并并转为 Enjoy 参数。
 * <p>
 * 同 {@code field}：{@code globalParams} 整条覆盖卡片 {@code params}。缺省不报错，由模板 {@code #if} 处理。
 * Enjoy 的 key 即 {@code field}，值始终是数组：有 {@code valueExp} 时先算出闭区间两个日期，否则原样使用 {@code value}。
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class VisParamHelper {

    public static Map<String, Object> toEnjoyMap(List<FilterItem> cardParams, List<FilterItem> globalParams) {
        return toEnjoyMap(cardParams, globalParams, null);
    }

    public static Map<String, Object> toEnjoyMap(List<FilterItem> cardParams, List<FilterItem> globalParams,
                                                 LocalDate today) {
        return buildMap(merge(cardParams, globalParams), today);
    }

    static List<FilterItem> merge(List<FilterItem> cardParams, List<FilterItem> globalParams) {
        Map<String, FilterItem> byField = new LinkedHashMap<>();
        putAll(byField, cardParams);
        putAll(byField, globalParams);
        return new ArrayList<>(byField.values());
    }

    private static Map<String, Object> buildMap(List<FilterItem> params, LocalDate today) {
        Map<String, Object> map = new LinkedHashMap<>();
        if (CollUtil.isEmpty(params)) {
            return map;
        }
        for (FilterItem item : params) {
            putItem(map, item, today);
        }
        return map;
    }

    private static void putAll(Map<String, FilterItem> byField, List<FilterItem> items) {
        if (CollUtil.isEmpty(items)) {
            return;
        }
        for (FilterItem item : items) {
            if (item == null || StrUtil.isBlank(item.getField())) {
                continue;
            }
            byField.put(item.getField(), item);
        }
    }

    private static void putItem(Map<String, Object> map, FilterItem item, LocalDate today) {
        if (item == null || StrUtil.isBlank(item.getField())) {
            return;
        }
        if (StrUtil.isNotBlank(item.getValueExp())) {
            String[] range = DateValueExpResolver.resolve(item.getValueExp(), item.getValue(),
                    today != null ? today : LocalDate.now());
            map.put(item.getField(), Arrays.asList(range[0], range[1]));
            return;
        }
        Object[] values = item.getValue();
        if (values == null || values.length == 0) {
            return;
        }
        map.put(item.getField(), Collections.unmodifiableList(Arrays.asList(values)));
    }
}
