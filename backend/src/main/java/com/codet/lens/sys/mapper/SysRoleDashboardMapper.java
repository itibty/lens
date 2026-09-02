package com.codet.lens.sys.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.codet.lens.sys.entity.SysRoleDashboard;
import java.util.Collection;
import java.util.List;
import org.apache.ibatis.annotations.Lang;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.scripting.xmltags.XMLLanguageDriver;

public interface SysRoleDashboardMapper extends BaseMapper<SysRoleDashboard> {

    @Lang(XMLLanguageDriver.class)
    @Select("""
            <script>
            select distinct rd.dashboard_id from sys_role_dashboard rd
            join sys_role r on r.id = rd.role_id
            where r.status = 'EBL'
              and r.role_code in
              <foreach collection="roleCodes" item="code" open="(" separator="," close=")">
                #{code}
              </foreach>
            </script>
            """)
    List<Long> findDashboardIdsByRoleCodes(@Param("roleCodes") Collection<String> roleCodes);
}
