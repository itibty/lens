package com.codet.lens.sys.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.codet.lens.sys.entity.SysMenu;
import java.util.Collection;
import java.util.List;
import org.apache.ibatis.annotations.Lang;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.scripting.xmltags.XMLLanguageDriver;

public interface SysMenuMapper extends BaseMapper<SysMenu> {

    @Lang(XMLLanguageDriver.class)
    @Select("""
            <script>
            select distinct m.* from sys_menu m
            join sys_role_menu rm on rm.menu_id = m.id
            join sys_role r on r.id = rm.role_id
            where r.status = 'EBL'
              and m.status = 'EBL' and m.menu_type = 'FUNC'
              and r.role_code in
              <foreach collection="roleCodes" item="code" open="(" separator="," close=")">
                #{code}
              </foreach>
            </script>
            """)
    List<SysMenu> findFuncsByRoleCodes(@Param("roleCodes") Collection<String> roleCodes);
}
