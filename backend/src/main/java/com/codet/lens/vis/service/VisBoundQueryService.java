package com.codet.lens.vis.service;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.codet.lens.common.FieldConst;
import com.codet.lens.common.ResultException;
import com.codet.lens.vis.core.dash.VisDashFilters;
import com.codet.lens.vis.dto.item.FilterItem;
import com.codet.lens.vis.dto.pivot.PivotQueryConfig;
import com.codet.lens.vis.dto.pivot.PivotQueryRequest;
import com.codet.lens.vis.dto.query.DetailQueryRequest;
import com.codet.lens.vis.dto.query.QueryConfig;
import com.codet.lens.vis.dto.query.QueryRequest;
import com.codet.lens.vis.entity.VisCard;
import com.codet.lens.vis.entity.VisDashboard;
import com.codet.lens.vis.entity.VisDashboardCard;
import com.codet.lens.vis.mapper.VisCardMapper;
import com.codet.lens.vis.mapper.VisDashboardCardMapper;
import com.codet.lens.vis.mapper.VisDashboardMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

/**
 * 查数请求绑定。
 * <p>
 * 两路不能混：
 * <ul>
 *   <li>dashboardId=0 且 cardId=0：卡片设计器预览。信 body 里的 query/visual，须有设计权限。</li>
 *   <li>其它：看板里已挂上的卡片。先确认能看这张看板、卡片属于这张看板，
 *       query/visual 只用 vis_card 落库的 query_json/visual_json。
 *       客户端只许带看板筛选（globalFilters / globalParams），明细还可带点击维 contextFilters。
 *       body 里的 datasetId、formula 等一律丢掉。</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class VisBoundQueryService {

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    private final VisDashboardAccess dashboardAccess;
    private final VisDashboardMapper dashboardMapper;
    private final VisDashboardCardMapper dashboardCardMapper;
    private final VisCardMapper cardMapper;

    public QueryRequest bindData(Long dashboardId, Long cardId, QueryRequest request) {
        if (isDesignerPreview(dashboardId, cardId)) {
            dashboardAccess.assertCanQueryCard(0L);
            return request == null ? new QueryRequest() : request;
        }
        BoundCard boundCard = requireBoundCard(dashboardId, cardId);
        QueryRequest bound = new QueryRequest();
        bound.setQuery(readJson(boundCard.card().getQueryJson(), QueryConfig.class, "查询配置"));
        bound.setVisual(readVisual(boundCard.card().getVisualJson()));
        copyAllowedGlobals(boundCard.dashboard(), datasetIdOf(bound.getQuery()),
                request == null ? null : request.getGlobalFilters(),
                request == null ? null : request.getGlobalParams(),
                bound::setGlobalFilters, bound::setGlobalParams);
        return bound;
    }

    public PivotQueryRequest bindPivot(Long dashboardId, Long cardId, PivotQueryRequest request) {
        if (isDesignerPreview(dashboardId, cardId)) {
            dashboardAccess.assertCanQueryCard(0L);
            return request == null ? new PivotQueryRequest() : request;
        }
        BoundCard boundCard = requireBoundCard(dashboardId, cardId);
        PivotQueryRequest bound = new PivotQueryRequest();
        bound.setQuery(readJson(boundCard.card().getQueryJson(), PivotQueryConfig.class, "查询配置"));
        bound.setVisual(readVisual(boundCard.card().getVisualJson()));
        copyAllowedGlobals(boundCard.dashboard(), datasetIdOf(bound.getQuery()),
                request == null ? null : request.getGlobalFilters(),
                request == null ? null : request.getGlobalParams(),
                bound::setGlobalFilters, bound::setGlobalParams);
        return bound;
    }

    public DetailQueryRequest bindDetail(Long dashboardId, Long cardId, DetailQueryRequest request) {
        if (isDesignerPreview(dashboardId, cardId)) {
            dashboardAccess.assertCanQueryCard(0L);
            return request == null ? new DetailQueryRequest() : request;
        }
        BoundCard boundCard = requireBoundCard(dashboardId, cardId);
        DetailQueryRequest bound = new DetailQueryRequest();
        bound.setQuery(readJson(boundCard.card().getQueryJson(), QueryConfig.class, "查询配置"));
        if (request != null) {
            bound.setContextFilters(request.getContextFilters());
        }
        copyAllowedGlobals(boundCard.dashboard(), datasetIdOf(bound.getQuery()),
                request == null ? null : request.getGlobalFilters(),
                request == null ? null : request.getGlobalParams(),
                bound::setGlobalFilters, bound::setGlobalParams);
        return bound;
    }

    public String cardTitle(Long cardId) {
        VisCard card = cardMapper.selectById(cardId);
        if (card == null || FieldConst.DEL.equals(card.getStatus()))
            return "card_" + cardId;
        return StrUtil.blankToDefault(card.getCardName(), "card_" + cardId);
    }

    private static boolean isDesignerPreview(Long dashboardId, Long cardId) {
        return Long.valueOf(0L).equals(dashboardId) && Long.valueOf(0L).equals(cardId);
    }

    /** 能看看板 + 卡片挂在该看板上 + 看板/卡片未删。查看态拒绝禁用看板；设计态仍可查数。 */
    private BoundCard requireBoundCard(Long dashboardId, Long cardId) {
        dashboardAccess.assertCanView(dashboardId);
        if (dashboardId == null || cardId == null || cardId == 0)
            throw ResultException.fail("看板或卡片无效");
        VisDashboard dash = dashboardMapper.selectById(dashboardId);
        if (dash == null || FieldConst.DEL.equals(dash.getStatus()))
            throw ResultException.fail("看板不存在");
        if (FieldConst.DBL.equals(dash.getStatus()) && !dashboardAccess.canDesign())
            throw ResultException.fail("看板已禁用");
        Long n = dashboardCardMapper.selectCount(Wrappers.<VisDashboardCard>lambdaQuery()
                .eq(VisDashboardCard::getDashboardId, dashboardId)
                .eq(VisDashboardCard::getCardId, cardId));
        if (n == null || n == 0)
            throw ResultException.fail("卡片不属于该看板");
        VisCard card = cardMapper.selectById(cardId);
        if (card == null || FieldConst.DEL.equals(card.getStatus()))
            throw ResultException.fail("卡片不存在");
        if (FieldConst.DBL.equals(card.getStatus()))
            throw ResultException.fail("卡片已禁用");
        return new BoundCard(dash, card);
    }

    private static void copyAllowedGlobals(VisDashboard dash, Long datasetId,
                                           List<FilterItem> globalFilters, List<FilterItem> globalParams,
                                           Consumer<List<FilterItem>> setFilters,
                                           Consumer<List<FilterItem>> setParams) {
        VisDashFilters.Allowed allowed = VisDashFilters.allowedForDataset(dash.getConfigJson(), datasetId);
        List<FilterItem> filters = VisDashFilters.keepFields(globalFilters, allowed.filterFields());
        List<FilterItem> params = VisDashFilters.keepFields(globalParams, allowed.paramFields());
        if (!filters.isEmpty()) {
            setFilters.accept(filters);
        }
        if (!params.isEmpty()) {
            setParams.accept(params);
        }
    }

    private static Long datasetIdOf(QueryConfig query) {
        return query == null ? null : query.getDatasetId();
    }

    private static Long datasetIdOf(PivotQueryConfig query) {
        return query == null ? null : query.getDatasetId();
    }

    private record BoundCard(VisDashboard dashboard, VisCard card) {
    }

    private static <T> T readJson(String json, Class<T> type, String label) {
        if (StrUtil.isBlank(json))
            throw ResultException.fail("卡片" + label + "为空");
        try {
            return MAPPER.readValue(json, type);
        } catch (JsonProcessingException e) {
            throw ResultException.fail("卡片" + label + "无效");
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> readVisual(String json) {
        if (StrUtil.isBlank(json))
            return Map.of();
        return readJson(json, Map.class, "可视化配置");
    }
}
