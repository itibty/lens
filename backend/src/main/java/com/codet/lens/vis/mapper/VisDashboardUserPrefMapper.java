package com.codet.lens.vis.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.codet.lens.vis.entity.VisDashboardUserPref;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface VisDashboardUserPrefMapper extends BaseMapper<VisDashboardUserPref> {
    @Insert("""
        INSERT INTO vis_dashboard_user_pref (id,user_id,dashboard_id,favorite,create_at,create_by)
        VALUES (#{id},#{userId},#{dashboardId},false,#{createAt},#{userId})
        ON DUPLICATE KEY UPDATE user_id=VALUES(user_id)
        """)
    void ensure(VisDashboardUserPref pref);
}
