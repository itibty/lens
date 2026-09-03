package com.codet.lens.vis.core.query;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RdsUtilTest {

    @Test
    void acceptsUniqueColumnLabels() {
        assertDoesNotThrow(() -> RdsUtil.requireUniqueColumnLabels(List.of("order_id", "customer_id")));
    }

    @Test
    void rejectsDuplicateColumnLabelsIgnoringCase() {
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> RdsUtil.requireUniqueColumnLabels(List.of("id", "name", "ID")));

        assertEquals("查询结果存在重复列名：ID。Lens 要求输出列名唯一，请使用 AS 设置唯一别名，"
                + "例如 a.id AS order_id、b.id AS customer_id", error.getMessage());
    }

    @Test
    void exactMaxRowsIsNotReportedAsTruncated() throws Exception {
        QueryContext context = selectTwoRows(true, true, false);

        assertFalse(context.isTruncated());
    }

    @Test
    void extraProbeRowIsTrimmedAndReportedAsTruncated() throws Exception {
        QueryFixture fixture = queryFixture(true, true, true);
        QueryContext context = new QueryContext(2, 2);
        QueryContextHolder.set(context);
        try {
            List<Map<String, Object>> rows = RdsUtil.selectList(
                    new SqlTplRet(null, "test", "select value", new Object[0]));

            assertEquals(2, rows.size());
            assertTrue(context.isTruncated());
            verify(fixture.statement()).setMaxRows(3);
        } finally {
            QueryContextHolder.remove();
        }
    }

    private static QueryContext selectTwoRows(Boolean... nextValues) throws Exception {
        queryFixture(nextValues);
        QueryContext context = new QueryContext(2, 2);
        QueryContextHolder.set(context);
        try {
            assertEquals(2, RdsUtil.selectList(
                    new SqlTplRet(null, "test", "select value", new Object[0])).size());
            return context;
        } finally {
            QueryContextHolder.remove();
        }
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    private static QueryFixture queryFixture(Boolean... nextValues) throws Exception {
        DatasourceRegistry registry = mock(DatasourceRegistry.class);
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        Connection connection = mock(Connection.class);
        PreparedStatement statement = mock(PreparedStatement.class);
        ResultSet resultSet = mock(ResultSet.class);
        ResultSetMetaData metadata = mock(ResultSetMetaData.class);
        when(registry.exists("test")).thenReturn(true);
        when(registry.template("test")).thenReturn(jdbc);
        when(connection.prepareStatement("select value")).thenReturn(statement);
        when(statement.executeQuery()).thenReturn(resultSet);
        when(resultSet.getMetaData()).thenReturn(metadata);
        when(metadata.getColumnCount()).thenReturn(1);
        when(metadata.getColumnLabel(1)).thenReturn("value");
        when(metadata.getColumnTypeName(1)).thenReturn("INTEGER");
        when(metadata.getColumnType(1)).thenReturn(java.sql.Types.INTEGER);
        when(resultSet.next()).thenReturn(nextValues[0], java.util.Arrays.copyOfRange(nextValues, 1, nextValues.length));
        when(resultSet.getObject(1)).thenReturn(1, 2, 3);
        org.mockito.Mockito.doAnswer(invocation -> {
            ConnectionCallback callback = invocation.getArgument(0);
            return callback.doInConnection(connection);
        }).when(jdbc).execute(any(ConnectionCallback.class));
        new RdsUtil(registry).bind();
        return new QueryFixture(statement);
    }

    private record QueryFixture(PreparedStatement statement) {
    }
}
