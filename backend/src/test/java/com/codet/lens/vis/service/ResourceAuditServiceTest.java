package com.codet.lens.vis.service;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.date.DateUtil;
import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.codet.lens.common.config.JacksonConfig;
import com.codet.lens.sys.entity.SysUser;
import com.codet.lens.sys.mapper.SysUserMapper;
import com.codet.lens.vis.dto.ResourceAuditInfo;
import com.codet.lens.vis.dto.card.VisCardInfo;
import com.codet.lens.vis.dto.dash.VisDashboardInfo;
import com.codet.lens.vis.dto.dataset.ConfSqlInfo;
import com.codet.lens.vis.dto.datasource.DatasourceInfo;
import com.codet.lens.vis.entity.VisCard;
import java.util.List;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ResourceAuditServiceTest {
    private final SysUserMapper users = mock(SysUserMapper.class);
    private final ResourceAuditService service = new ResourceAuditService(users);

    @BeforeAll
    static void initUserMapping() {
        TableInfoHelper.initTableInfo(new MapperBuilderAssistant(new MybatisConfiguration(), "audit-test"), SysUser.class);
    }

    @Test
    void resolvesNamesInOneBatchAndKeepsMissingAndSystemActorsDistinct() {
        var named = new SysUser().setRealName("张三").setUsername("zhangsan");
        named.setId(1L);
        var accountOnly = new SysUser().setRealName(" ").setUsername("lisi");
        accountOnly.setId(2L);
        when(users.selectList(any())).thenReturn(List.of(named, accountOnly));
        var first = new VisCardInfo();
        first.setCreateBy(1L);
        first.setModifyBy(2L);
        var second = new VisDashboardInfo();
        second.setCreateBy(1L);
        second.setModifyBy(99L);
        var third = new ConfSqlInfo();
        third.setModifyBy(0L);

        service.fillNames(List.of(first, second, third));

        assertEquals("张三", first.getCreateByName());
        assertEquals("lisi", first.getModifyByName());
        assertEquals("张三", second.getCreateByName());
        assertEquals("用户（99）", second.getModifyByName());
        assertNull(third.getCreateByName());
        assertEquals("系统", third.getModifyByName());
        verify(users, times(1)).selectList(any());
    }

    @Test
    void skipsUserQueryForEmptyOrSystemOnlyRecords() {
        service.fillNames(List.of());
        var info = new DatasourceInfo();
        info.setCreateBy(0L);
        service.fillNames(List.of(info));
        assertEquals("系统", info.getCreateByName());
        assertNull(info.getModifyByName());
        verifyNoInteractions(users);
    }

    @Test
    void inheritedAuditFieldsAreCopiedAndDatesRemainFormattedAcrossAllResourceDtos() {
        var row = new VisCard();
        row.setCreateBy(9007199254740993L).setModifyBy(9007199254740994L)
                .setCreateAt(1789088400000L).setModifyAt(1789088460000L);
        var builder = JsonMapper.builder();
        new JacksonConfig().longAsStringCustomizer().customize(builder);
        var mapper = builder.build();
        for (Class<? extends ResourceAuditInfo> type : List.of(
                VisCardInfo.class, VisDashboardInfo.class, ConfSqlInfo.class, DatasourceInfo.class)) {
            var info = BeanUtil.copyProperties(row, type);
            var json = mapper.readTree(mapper.writeValueAsString(info));
            assertEquals("9007199254740993", json.get("createBy").asText());
            assertEquals("9007199254740994", json.get("modifyBy").asText());
            assertEquals(DateUtil.formatDateTime(DateUtil.date(row.getCreateAt())), json.get("createAt").asText());
            assertEquals(DateUtil.formatDateTime(DateUtil.date(row.getModifyAt())), json.get("modifyAt").asText());
        }
    }
}
