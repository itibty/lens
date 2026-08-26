package com.codet.lens.sys;

import cn.hutool.crypto.digest.BCrypt;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.codet.lens.common.FieldConst;
import com.codet.lens.common.LensProperties;
import com.codet.lens.sys.entity.SysUser;
import com.codet.lens.sys.entity.SysUserRole;
import com.codet.lens.sys.mapper.SysUserMapper;
import com.codet.lens.sys.mapper.SysUserRoleMapper;
import com.codet.lens.vis.entity.VisDatasource;
import com.codet.lens.vis.mapper.VisDatasourceMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private final SysUserMapper userMapper;
    private final SysUserRoleMapper userRoleMapper;
    private final VisDatasourceMapper datasourceMapper;
    private final LensProperties properties;
    @Value("${spring.datasource.url}")
    private String jdbcUrl;
    @Value("${spring.datasource.username}")
    private String jdbcUsername;
    @Value("${spring.datasource.password}")
    private String jdbcPassword;

    @Override
    public void run(ApplicationArguments args) {
        Long count = userMapper.selectCount(Wrappers.emptyWrapper());
        if (count != null && count > 0) {
            return;
        }
        SysUser admin = new SysUser();
        admin.setId(1L);
        admin.setUsername(properties.getAdminUsername());
        admin.setPassword(BCrypt.hashpw(properties.getAdminPassword()));
        admin.setRealName("管理员");
        admin.setStatus(FieldConst.EBL);
        admin.createCallback();
        userMapper.insert(admin);
        SysUserRole link = new SysUserRole();
        link.setUserId(1L);
        link.setRoleId(1L);
        link.setCreateAt(System.currentTimeMillis());
        userRoleMapper.insert(link);
        log.info("已写入初始管理员 {}", properties.getAdminUsername());
        if (datasourceMapper.selectCount(Wrappers.emptyWrapper()) == 0) {
            VisDatasource ds = new VisDatasource();
            ds.setId(1L);
            ds.setSourceName("lens");
            ds.setDbType("MYSQL");
            ds.setJdbcUrl(jdbcUrl);
            ds.setUsername(jdbcUsername);
            ds.setPassword(jdbcPassword);
            ds.setStatus(FieldConst.EBL);
            ds.createCallback();
            datasourceMapper.insert(ds);
            log.info("已写入默认数据源 lens");
        }
    }
}
