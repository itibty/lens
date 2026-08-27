package com.codet.lens.vis.service;

import cn.hutool.core.util.StrUtil;
import com.codet.lens.common.FieldConst;
import com.codet.lens.common.ResultException;
import com.codet.lens.vis.core.query.SqlDialect;
import com.codet.lens.vis.entity.VisDatasource;
import com.codet.lens.vis.mapper.VisDatasourceMapper;
import com.codet.lens.vis.rds.core.DatasourceRegistry;
import com.codet.lens.vis.rds.core.MetaInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * 当前连接 catalog/schema 的表、字段和索引元数据。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DatasourceMetaService {

    private static final String[] TABLE_TYPES = {"TABLE", "VIEW"};

    private final VisDatasourceMapper datasourceMapper;
    private final DatasourceRegistry datasourceRegistry;

    public record TableOption(String name, String value) {
    }

    public List<TableOption> listTables(String sourceName) {
        VisDatasource source = requireSource(sourceName);
        DataSource dataSource = datasourceRegistry.raw(sourceName);
        try (Connection connection = dataSource.getConnection()) {
            Scope scope = resolveScope(connection, source.getDbType());
            return readTables(connection.getMetaData(), scope).stream()
                    .map(table -> new TableOption(
                            StrUtil.blankToDefault(table.comment(), null),
                            qualify(scope.name(), table.name())))
                    .toList();
        } catch (SQLException e) {
            throw metadataFail(sourceName, e);
        }
    }

    public List<MetaInfo.SchemaInfo> getMetaTree(String sourceName, String tables) {
        VisDatasource source = requireSource(sourceName);
        DataSource dataSource = datasourceRegistry.raw(sourceName);
        try (Connection connection = dataSource.getConnection()) {
            Scope scope = resolveScope(connection, source.getDbType());
            DatabaseMetaData metadata = connection.getMetaData();
            List<TableRef> available = readTables(metadata, scope);
            Set<String> requested = parseTableNames(tables, scope.name());
            if (StrUtil.isNotBlank(tables) && requested.isEmpty()) {
                throw ResultException.fail("tables参数无效");
            }
            List<TableRef> selected = selectTables(available, requested);

            MetaInfo.SchemaInfo schema = new MetaInfo.SchemaInfo();
            schema.setName(scope.name());
            schema.setDbType(source.getDbType());
            List<MetaInfo.TableInfo> tableInfos = new ArrayList<>();
            for (TableRef table : selected) {
                tableInfos.add(readTable(metadata, scope, table));
            }
            schema.setTableInfos(tableInfos);
            return List.of(schema);
        } catch (SQLException e) {
            throw metadataFail(sourceName, e);
        }
    }

    static Set<String> parseTableNames(String tables, String scopeName) {
        if (StrUtil.isBlank(tables)) {
            return Set.of();
        }
        Set<String> names = new LinkedHashSet<>();
        for (String item : tables.split(",")) {
            String qualified = StrUtil.trim(item);
            if (StrUtil.isBlank(qualified)) {
                continue;
            }
            int dot = qualified.lastIndexOf('.');
            if (dot < 0) {
                names.add(qualified);
                continue;
            }
            String scope = StrUtil.trim(qualified.substring(0, dot));
            String table = StrUtil.trim(qualified.substring(dot + 1));
            if (StrUtil.isNotBlank(table) && scope.equalsIgnoreCase(scopeName)) {
                names.add(table);
            }
        }
        return names;
    }

    private VisDatasource requireSource(String sourceName) {
        VisDatasource source = datasourceMapper.selectList(null).stream()
                .filter(row -> sourceName.equals(row.getSourceName())
                        && FieldConst.EBL.equals(row.getStatus()))
                .findFirst()
                .orElse(null);
        if (source == null) {
            throw ResultException.fail("数据源不存在或已禁用");
        }
        SqlDialect.of(source.getDbType());
        return source;
    }

    private static Scope resolveScope(Connection connection, String dbType) throws SQLException {
        String type = StrUtil.blankToDefault(dbType, "").toUpperCase(Locale.ROOT);
        String catalog = StrUtil.trim(connection.getCatalog());
        String schema = StrUtil.trim(connection.getSchema());
        if (FieldConst.MYSQL.equals(type) || "MARIADB".equals(type)) {
            String name = StrUtil.blankToDefault(catalog, schema);
            return new Scope(requireScopeName(name), catalog, null);
        }
        String name = StrUtil.blankToDefault(schema, catalog);
        return new Scope(requireScopeName(name), catalog, schema);
    }

    private static String requireScopeName(String name) {
        if (StrUtil.isBlank(name)) {
            throw ResultException.fail("无法识别数据源的 catalog/schema");
        }
        return name;
    }

    private static List<TableRef> readTables(DatabaseMetaData metadata, Scope scope) throws SQLException {
        List<TableRef> tables = new ArrayList<>();
        try (ResultSet rs = metadata.getTables(scope.catalog(), scope.schema(), "%", TABLE_TYPES)) {
            while (rs.next()) {
                String name = StrUtil.trim(rs.getString("TABLE_NAME"));
                if (StrUtil.isBlank(name)) {
                    continue;
                }
                tables.add(new TableRef(name, StrUtil.trim(rs.getString("REMARKS"))));
            }
        }
        tables.sort(Comparator.comparing(TableRef::name, String.CASE_INSENSITIVE_ORDER));
        return tables;
    }

    private static List<TableRef> selectTables(List<TableRef> available, Set<String> requested) {
        if (requested.isEmpty()) {
            return available;
        }
        Map<String, TableRef> byName = new LinkedHashMap<>();
        for (TableRef table : available) {
            byName.putIfAbsent(table.name().toLowerCase(Locale.ROOT), table);
        }
        List<TableRef> selected = new ArrayList<>();
        List<String> missing = new ArrayList<>();
        for (String name : requested) {
            TableRef table = byName.get(name.toLowerCase(Locale.ROOT));
            if (table == null) {
                missing.add(name);
            } else {
                selected.add(table);
            }
        }
        if (!missing.isEmpty()) {
            throw ResultException.fail("数据表不存在：" + String.join("、", missing));
        }
        return selected;
    }

    private static MetaInfo.TableInfo readTable(DatabaseMetaData metadata, Scope scope, TableRef table)
            throws SQLException {
        Set<String> primaryKeys = readPrimaryKeys(metadata, scope, table.name());
        MetaInfo.TableInfo info = new MetaInfo.TableInfo();
        info.setName(table.name());
        info.setComment(table.comment());
        info.setFieldInfos(readFields(metadata, scope, table.name(), primaryKeys));
        info.setIndexInfos(readIndexes(metadata, scope, table.name()));
        return info;
    }

    private static Set<String> readPrimaryKeys(DatabaseMetaData metadata, Scope scope, String table)
            throws SQLException {
        Set<String> keys = new LinkedHashSet<>();
        try (ResultSet rs = metadata.getPrimaryKeys(scope.catalog(), scope.schema(), table)) {
            while (rs.next()) {
                String column = StrUtil.trim(rs.getString("COLUMN_NAME"));
                if (StrUtil.isNotBlank(column)) {
                    keys.add(column.toLowerCase(Locale.ROOT));
                }
            }
        }
        return keys;
    }

    private static List<MetaInfo.FieldInfo> readFields(DatabaseMetaData metadata, Scope scope, String table,
                                                        Set<String> primaryKeys) throws SQLException {
        List<MetaInfo.FieldInfo> fields = new ArrayList<>();
        try (ResultSet rs = metadata.getColumns(scope.catalog(), scope.schema(), table, "%")) {
            while (rs.next()) {
                if (!table.equalsIgnoreCase(rs.getString("TABLE_NAME"))) {
                    continue;
                }
                String name = rs.getString("COLUMN_NAME");
                String type = StrUtil.blankToDefault(rs.getString("TYPE_NAME"), "").toLowerCase(Locale.ROOT);
                Integer size = integer(rs, "COLUMN_SIZE");
                Integer digits = integer(rs, "DECIMAL_DIGITS");
                Integer nullable = integer(rs, "NULLABLE");
                MetaInfo.FieldInfo field = new MetaInfo.FieldInfo()
                        .setName(name)
                        .setComment(StrUtil.trim(rs.getString("REMARKS")))
                        .setType(type)
                        .setTypeDesc(typeDesc(type, size, digits))
                        .setIsPk(primaryKeys.contains(name.toLowerCase(Locale.ROOT)))
                        .setNullable(Integer.valueOf(DatabaseMetaData.columnNullable).equals(nullable))
                        .setDefaultValue(rs.getString("COLUMN_DEF"))
                        .setIsAutoIncrement("YES".equalsIgnoreCase(safeString(rs, "IS_AUTOINCREMENT")));
                fields.add(field);
            }
        }
        return fields;
    }

    private static List<MetaInfo.IndexInfo> readIndexes(DatabaseMetaData metadata, Scope scope, String table)
            throws SQLException {
        Map<String, IndexAccumulator> indexes = new LinkedHashMap<>();
        try (ResultSet rs = metadata.getIndexInfo(scope.catalog(), scope.schema(), table, false, false)) {
            while (rs.next()) {
                String name = StrUtil.trim(rs.getString("INDEX_NAME"));
                String column = StrUtil.trim(rs.getString("COLUMN_NAME"));
                Integer indexType = integer(rs, "TYPE");
                if (StrUtil.isBlank(name) || StrUtil.isBlank(column)
                        || Integer.valueOf(DatabaseMetaData.tableIndexStatistic).equals(indexType)) {
                    continue;
                }
                IndexAccumulator index = indexes.computeIfAbsent(name,
                        key -> new IndexAccumulator(!booleanValue(rs, "NON_UNIQUE")));
                String direction = safeString(rs, "ASC_OR_DESC");
                index.columns().add(column + ("A".equalsIgnoreCase(direction)
                        ? " ASC" : "D".equalsIgnoreCase(direction) ? " DESC" : ""));
            }
        }
        return indexes.entrySet().stream()
                .map(entry -> new MetaInfo.IndexInfo()
                        .setName(entry.getKey())
                        .setIsUnique(entry.getValue().unique())
                        .setFieldDesc(String.join(", ", entry.getValue().columns())))
                .toList();
    }

    static String typeDesc(String type, Integer size, Integer digits) {
        if (size == null || size <= 0) {
            return type;
        }
        if (digits != null && digits > 0) {
            return type + "(" + size + "," + digits + ")";
        }
        return type + "(" + size + ")";
    }

    private static Integer integer(ResultSet rs, String column) {
        try {
            int value = rs.getInt(column);
            return rs.wasNull() ? null : value;
        } catch (SQLException ignored) {
            return null;
        }
    }

    private static String safeString(ResultSet rs, String column) {
        try {
            return rs.getString(column);
        } catch (SQLException ignored) {
            return null;
        }
    }

    private static boolean booleanValue(ResultSet rs, String column) {
        try {
            return rs.getBoolean(column);
        } catch (SQLException ignored) {
            return false;
        }
    }

    private static String qualify(String scope, String table) {
        return scope + "." + table;
    }

    private static ResultException metadataFail(String sourceName, SQLException e) {
        log.warn("读取数据源元数据失败 sourceName={}", sourceName, e);
        return ResultException.fail("读取数据源元数据失败");
    }

    private record Scope(String name, String catalog, String schema) {
    }

    private record TableRef(String name, String comment) {
    }

    private record IndexAccumulator(boolean unique, List<String> columns) {
        private IndexAccumulator(boolean unique) {
            this(unique, new ArrayList<>());
        }
    }
}
