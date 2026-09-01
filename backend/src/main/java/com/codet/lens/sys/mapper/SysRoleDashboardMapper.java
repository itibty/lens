package com.codet.lens.sys.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.codet.lens.sys.entity.SysRoleDashboard;
import java.util.List;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

public interface SysRoleDashboardMapper extends BaseMapper<SysRoleDashboard> {

    @Select("""
            select distinct rd.dashboard_id from sys_role_dashboard rd
            join sys_user_role ur on ur.role_id = rd.role_id
            join sys_role r on r.id = ur.role_id
            where ur.user_id = #{userId} and r.status = 'EBL'
              and (ur.start_at is null or ur.start_at <= #{now})
              and (ur.end_at is null or ur.end_at >= #{now})
            """)
    List<Long> findUserDashboardIds(@Param("userId") Long userId, @Param("now") Long now);
}
