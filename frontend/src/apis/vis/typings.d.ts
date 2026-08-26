declare namespace VIS {
  type AssignNode = {
    /** id */
    id?: string;
    /** parent id */
    pid?: string;
    /** 子节点 */
    children?: AssignNode[];
    name?: string;
    icon?: string;
    nodeType?: string;
  };

  type ConfSqlContentRequest = {
    id: string;
    sqlContent: string;
    sqlParams?: string;
  };

  type ConfSqlFieldInfo = {
    /** 列名 */
    field: string;
    /** 类型 */
    dataType: "STRING" | "NUMBER" | "DATE" | "DATETIME";
    /** 建议用法 */
    suggestRole: "DIMENSION" | "METRIC";
  };

  type ConfSqlFieldSaveRequest = {
    sqlId: string;
    fields?: ConfSqlFieldInfo[];
  };

  type ConfSqlInfo = {
    /** 数据id */
    id: string;
    /** 名称 */
    sqlName: string;
    /** 备注(对sql中动态参数做说明) */
    sqlDesc?: string;
    /** sql脚本 */
    sqlContent?: string;
    /** 调用参数示例 */
    sqlParams?: string;
    /** 数据源id */
    dsId: string;
    /** 数据源名 */
    dsName: string;
    /** 状态 */
    status: "EBL" | "DBL";
    /** 模板引擎 */
    tplEngine: "ENJOY";
  };

  type ConfSqlInfoRequest = {
    /** 数据id */
    id?: string;
    /** 名称 */
    sqlName: string;
    /** 描述 */
    sqlDesc?: string;
    /** 数据源id */
    dsId: string;
    /** sql模板引擎 */
    tplEngine: "ENJOY";
    /** 账号状态 */
    status: "EBL" | "DBL";
  };

  type ContrastConfig = {
    /** 对比用的日期字段 */
    timeField: string;
    /** 对比期平移 */
    calcMethod:
      | "shift_day"
      | "shift_week"
      | "shift_month"
      | "shift_year"
      | "shift_period";
    /** 结果列 */
    calcType: "diff" | "diffRate";
    /** 评估期快捷。current_week/current_month/current_year 为周期起始日～asOfDate */
    valueExp:
      | "current_day"
      | "last_day"
      | "last_days"
      | "last_xy_days"
      | "current_week"
      | "last_week"
      | "current_month"
      | "last_month"
      | "current_year"
      | "last_year";
    /** 快捷参数 */
    value?: any[];
  };

  type ContrastInfo = {
    /** 结果列名 */
    label: string;
    /** 对比日期字段 */
    timeField: string;
    /** 平移算法 */
    calcMethod:
      | "shift_day"
      | "shift_week"
      | "shift_month"
      | "shift_year"
      | "shift_period";
    /** 结果列类型 */
    calcType: "diff" | "diffRate";
    /** 当前期 */
    current: ContrastRange;
    /** 对比期 */
    compare: ContrastRange;
  };

  type ContrastRange = {
    /** 日期快捷 */
    valueExp?: string;
    /** 闭区间起，yyyy-MM-dd */
    start: string;
    /** 闭区间止，yyyy-MM-dd */
    end: string;
  };

  type DashGroupInfo = {
    /** id */
    id?: string;
    /** parent id */
    pid?: string;
    /** 子节点 */
    children?: DashGroupInfo[];
    groupName?: string;
    icon?: string;
    sortNum?: number;
    status?: string;
    dashCount?: number;
    descDashCount?: number;
  };

  type DateWindowRequest = {
    /** 日期快捷基准日 */
    asOfDate?: string;
    /** 评估期快捷。current_week/current_month/current_year 为周期起始日～asOfDate */
    valueExp:
      | "current_day"
      | "last_day"
      | "last_days"
      | "last_xy_days"
      | "current_week"
      | "last_week"
      | "current_month"
      | "last_month"
      | "current_year"
      | "last_year";
    /** 快捷参数 */
    value?: any[];
    /** 对比期平移 */
    calcMethod?:
      | "shift_day"
      | "shift_week"
      | "shift_month"
      | "shift_year"
      | "shift_period";
  };

  type DateWindowResponse = {
    /** 日期快捷基准日 */
    asOfDate: string;
    /** 当前期 */
    current: ContrastRange;
    /** 对比期。未传 calcMethod 时为空 */
    compare?: ContrastRange;
  };

  type DebugSqlColumn = {
    field?: string;
    jdbcType?: string;
    dataType?: string;
    suggestRole?: string;
  };

  type DebugSqlRequest = {
    /** sql脚本模板 */
    sqlContent: string;
    /** sql脚本模板 */
    execSql: boolean;
    /** sql执行参数 */
    params: Record<string, any>;
    /** 脚本配置id（运行时必须） */
    id?: string;
  };

  type DebugSqlResponse = {
    /** sql statement */
    sql: string;
    /** sql 参数 */
    params: any[];
    /** 执行阶段耗时信息 */
    timeInfos: any[];
    /** 查询数据行 */
    execRet?: Record<string, any>[];
    /** 结果列 */
    columns?: DebugSqlColumn[];
    /** 错误摘要（失败时） */
    error?: string;
    /** 完整异常堆栈（失败时，仅调试接口） */
    stackTrace?: string;
  };

  type delDashGroupParams = {
    groupId: string;
  };

  type DetailQueryRequest = {
    /** 查询配置。只用数据集、过滤、参数、日期；维度仅用于补全点击维粒度 */
    query: QueryConfig;
    /** 点击维值，叠到行级过滤。不传则查当前卡片范围内的全部明细 */
    contextFilters?: FilterItem[];
    /** 看板全局行级过滤 */
    globalFilters?: FilterItem[];
    /** 看板全局数据集条件 */
    globalParams?: FilterItem[];
  };

  type DimensionItem = {
    /** 字段名 */
    field: string;
    /** 显示别名 */
    label?: string;
    /** 时间粒度 */
    timeGrain?: "day" | "week" | "month" | "year";
  };

  type DsOption = {
    type?: string;
    category?: string;
    name?: string;
    value?: string;
  };

  type ExecSqlInfo = {
    /** 用途 */
    name: string;
    /** SQL 语句 */
    sql: string;
    /** 绑定参数 */
    params: any[];
  };

  type exportCardDataParams = {
    dashboardId: string;
    cardId: string;
  };

  type FilterGroup = {
    /** 组内连接 */
    combineOp: "and" | "or";
    /** 组内条件 */
    conditions: FilterItem[];
  };

  type FilterItem = {
    /** 字段名 */
    field: string;
    /** 显示别名 */
    label?: string;
    /** 操作符 */
    op?:
      | "eq"
      | "ne"
      | "gt"
      | "gte"
      | "lt"
      | "lte"
      | "in"
      | "not_in"
      | "like"
      | "not_like"
      | "between"
      | "is_null"
      | "is_not_null";
    /** 比较值 */
    value?: any[];
    /** 日期快捷。current_week/current_month/current_year 为周期起始日～asOfDate */
    valueExp?:
      | "current_day"
      | "last_day"
      | "last_days"
      | "last_xy_days"
      | "current_week"
      | "last_week"
      | "current_month"
      | "last_month"
      | "current_year"
      | "last_year";
    /** 时间粒度。明细点击维带了粒度时，按同一表达式过滤 */
    timeGrain?: "day" | "week" | "month" | "year";
  };

  type getCardDetailParams = {
    cardId: string;
  };

  type getDashboardDetailParams = {
    dashboardId: string;
  };

  type getDatasetDetailParams = {
    sqlId: string;
  };

  type getDatasourceMetaTreeParams = {
    sourceName: string;
    tables?: string;
  };

  type HavingFilterItem = {
    /** 字段名 */
    field: string;
    /** 显示别名 */
    label?: string;
    /** 操作符 */
    op?:
      | "eq"
      | "ne"
      | "gt"
      | "gte"
      | "lt"
      | "lte"
      | "in"
      | "not_in"
      | "like"
      | "not_like"
      | "between"
      | "is_null"
      | "is_not_null";
    /** 比较值 */
    value?: any[];
    /** 日期快捷。current_week/current_month/current_year 为周期起始日～asOfDate */
    valueExp?:
      | "current_day"
      | "last_day"
      | "last_days"
      | "last_xy_days"
      | "current_week"
      | "last_week"
      | "current_month"
      | "last_month"
      | "current_year"
      | "last_year";
    /** 时间粒度。明细点击维带了粒度时，按同一表达式过滤 */
    timeGrain?: "day" | "week" | "month" | "year";
    /** 聚合函数 */
    agg?: "SUM" | "COUNT" | "AVG" | "MIN" | "MAX" | "COUNT_DISTINCT";
    /** 计算公式 */
    formula?: string;
  };

  type IdsRequest = {
    /** id集合 */
    ids: string[];
  };

  type listCardDashboardsParams = {
    cardId: string;
  };

  type listDatasetFieldsByIdParams = {
    datasetId: string;
  };

  type listDatasetFieldsParams = {
    sqlId: string;
  };

  type listDatasourceOptionsParams = {
    dsType: string;
  };

  type listDatasourceTablesParams = {
    sourceName: string;
  };

  type ListResponseAssignNode = {
    /** 列表 */
    list?: AssignNode[];
  };

  type ListResponseDashGroupInfo = {
    /** 列表 */
    list?: DashGroupInfo[];
  };

  type ListResponseDsOption = {
    /** 列表 */
    list?: DsOption[];
  };

  type ListResponseManageNode = {
    /** 列表 */
    list?: ManageNode[];
  };

  type ListResponseNameValue = {
    /** 列表 */
    list?: NameValue[];
  };

  type ListResponseReportNode = {
    /** 列表 */
    list?: ReportNode[];
  };

  type ListResponseObject = {
    /** 列表 */
    list?: any[];
  };

  type ListResponseVisDashboardRefInfo = {
    /** 列表 */
    list?: VisDashboardRefInfo[];
  };

  type ListResponseVisDatasetInfo = {
    /** 列表 */
    list?: VisDatasetInfo[];
  };

  type ManageNode = {
    /** id */
    id?: string;
    /** parent id */
    pid?: string;
    /** 子节点 */
    children?: ManageNode[];
    nodeType?: string;
    name?: string;
    icon?: string;
    status?: string;
    sortNum?: number;
    groupId?: string;
    virtual?: boolean;
  };

  type MetricItem = {
    /** 字段名 */
    field: string;
    /** 显示别名 */
    label?: string;
    /** 聚合函数 */
    agg?: "SUM" | "COUNT" | "AVG" | "MIN" | "MAX" | "COUNT_DISTINCT";
    /** 计算公式 */
    formula?: string;
    /** 对比配置 */
    contrast?: ContrastConfig;
  };

  type MoveDashboardsGroupRequest = {
    /** 看板 id 集合 */
    dashboardIds: string[];
    /** 目标分组 id。0 表示挂到报表中心根下 */
    groupId: string;
  };

  type NameValue = {
    name?: string;
    value?: string;
  };

  type OrderItem = {
    /** 字段名 */
    field: string;
    /** 显示别名 */
    label?: string;
    /** 排序方向 */
    dir: "asc" | "desc";
  };

  type PageCondition = {
    /** 当前页 */
    pageNumber: number;
    /** 每页大小 */
    pageSize: number;
  };

  type PageResponseConfSqlInfo = {
    /** 当前页 */
    pageNumber: number;
    /** 每页大小 */
    pageSize: number;
    /** 总条数 */
    total: number;
    /** 总页数 */
    pages: number;
    /** 记录 */
    records?: ConfSqlInfo[];
  };

  type PageResponseVisCardInfo = {
    /** 当前页 */
    pageNumber: number;
    /** 每页大小 */
    pageSize: number;
    /** 总条数 */
    total: number;
    /** 总页数 */
    pages: number;
    /** 记录 */
    records?: VisCardInfo[];
  };

  type PageResponseVisDashboardInfo = {
    /** 当前页 */
    pageNumber: number;
    /** 每页大小 */
    pageSize: number;
    /** 总条数 */
    total: number;
    /** 总页数 */
    pages: number;
    /** 记录 */
    records?: VisDashboardInfo[];
  };

  type PivotColumn = {
    /** 列 id */
    id: string;
    /** 列维取值 */
    path: any[];
    /** 列角色 */
    role: "detail" | "subtotal" | "total";
  };

  type PivotQueryConfig = {
    /** 数据集 id */
    datasetId: string;
    /** 日期快捷基准日 */
    asOfDate?: string;
    /** 行维 */
    rowDimensions?: DimensionItem[];
    /** 列维 */
    colDimensions?: DimensionItem[];
    /** 指标 */
    metrics: MetricItem[];
    /** 行级过滤 */
    filters?: FilterGroup[];
    /** 数据集条件 */
    params?: FilterItem[];
    /** 聚合后过滤 */
    havingFilters?: HavingFilterItem[];
    /** 排序 */
    orderList?: OrderItem[];
    /** 最大行数 */
    limit?: number;
  };

  type PivotQueryRequest = {
    /** 查询配置 */
    query: PivotQueryConfig;
    /** 可视化配置 */
    visual: Record<string, any>;
    /** 看板全局行级过滤 */
    globalFilters?: FilterItem[];
    /** 看板全局数据集条件 */
    globalParams?: FilterItem[];
  };

  type PivotQueryResponse = {
    /** 行维字段 */
    rowFields: string[];
    /** 列维字段 */
    columnFields: string[];
    /** 指标别名 */
    metrics: string[];
    /** 列头 */
    columns: PivotColumn[];
    /** 数据行 */
    rows: PivotRow[];
    /** 行数 */
    total: number;
    /** 明细行是否截断 */
    truncated: boolean;
    /** 列头是否截断 */
    columnTruncated: boolean;
    /** 实际执行的 SQL */
    execSqls?: ExecSqlInfo[];
  };

  type PivotRow = {
    /** 行维取值 */
    path: any[];
    /** 行角色 */
    role: "detail" | "subtotal" | "total";
    /** 行维层数 */
    level: number;
    /** 单元格 */
    values: Record<string, any>;
  };

  type queryCardDataParams = {
    dashboardId: string;
    cardId: string;
  };

  type queryCardDetailParams = {
    dashboardId: string;
    cardId: string;
  };

  type queryCardPivotParams = {
    dashboardId: string;
    cardId: string;
  };

  type QueryConfig = {
    /** 数据集 id */
    datasetId: string;
    /** 日期快捷基准日 */
    asOfDate?: string;
    /** 维度 */
    dimensions?: DimensionItem[];
    /** 指标 */
    metrics?: MetricItem[];
    /** 行级过滤 */
    filters?: FilterGroup[];
    /** 数据集条件 */
    params?: FilterItem[];
    /** 聚合后过滤 */
    havingFilters?: HavingFilterItem[];
    /** 结果列过滤 */
    resultFilters?: FilterItem[];
    /** 排序 */
    orderList?: OrderItem[];
    /** 最大行数 */
    limit?: number;
  };

  type QueryConfSqlRequest = {
    /** 分页 */
    page: PageCondition;
    /** 数据id */
    id?: string;
    /** 名称 */
    sqlName?: string;
    /** 备注 */
    sqlDesc?: string;
    /** 数据源id */
    dsId?: string;
    /** 数据源名 */
    dsName?: string;
    /** 状态 */
    status?: "EBL" | "DBL";
  };

  type QueryDataResponse = {
    /** 列名列表 */
    columns: string[];
    /** 数据行 */
    rows: Record<string, any>[];
    /** 行数 */
    total: number;
    /** 是否截断 */
    truncated: boolean;
    /** 日期快捷基准日 */
    asOfDate?: string;
    /** 对比窗口 */
    contrasts?: ContrastInfo[];
    /** 实际执行的 SQL */
    execSqls?: ExecSqlInfo[];
  };

  type QueryRequest = {
    /** 查询配置 */
    query: QueryConfig;
    /** 可视化配置 */
    visual: Record<string, any>;
    /** 看板全局行级过滤 */
    globalFilters?: FilterItem[];
    /** 看板全局数据集条件 */
    globalParams?: FilterItem[];
  };

  type QueryVisCardRequest = {
    /** 分页 */
    page: PageCondition;
    /** 卡片 id */
    id?: string;
    /** 卡片名 */
    cardName?: string;
    /** 数据集 id */
    datasetId?: string;
    /** 图表类型 */
    chartType?: string;
    /** 状态 */
    status?: "EBL" | "DBL";
  };

  type QueryVisDashboardRequest = {
    /** 分页 */
    page: PageCondition;
    /** 看板 id */
    id?: string;
    /** 分组 id。0 表示报表中心根下 */
    groupId?: string;
    /** groupId 非 0 时是否包含子孙分组。默认 true；抽屉精确查询传 false */
    includeDescendants?: boolean;
    /** 看板名 */
    dashName?: string;
    /** 状态 */
    status?: "EBL" | "DBL";
  };

  type ReportNode = {
    /** id */
    id?: string;
    /** parent id */
    pid?: string;
    /** 子节点 */
    children?: ReportNode[];
    name?: string;
    icon?: string;
    /** 看板节点为 /vis/report/{id}；分组为空 */
    url?: string;
    nodeType?: string;
  };

  type RConfSqlInfo = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: ConfSqlInfo;
  };

  type RDateWindowResponse = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: DateWindowResponse;
  };

  type RDebugSqlResponse = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: DebugSqlResponse;
  };

  type RListConfSqlFieldInfo = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: ConfSqlFieldInfo[];
  };

  type RListResponseAssignNode = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: ListResponseAssignNode;
  };

  type RListResponseDashGroupInfo = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: ListResponseDashGroupInfo;
  };

  type RListResponseDsOption = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: ListResponseDsOption;
  };

  type RListResponseManageNode = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: ListResponseManageNode;
  };

  type RListResponseNameValue = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: ListResponseNameValue;
  };

  type RListResponseReportNode = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: ListResponseReportNode;
  };

  type RListResponseObject = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: ListResponseObject;
  };

  type RListResponseVisDashboardRefInfo = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: ListResponseVisDashboardRefInfo;
  };

  type RListResponseVisDatasetInfo = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: ListResponseVisDatasetInfo;
  };

  type RLong = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: string;
  };

  type RPageResponseConfSqlInfo = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: PageResponseConfSqlInfo;
  };

  type RPageResponseVisCardInfo = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: PageResponseVisCardInfo;
  };

  type RPageResponseVisDashboardInfo = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: PageResponseVisDashboardInfo;
  };

  type RPivotQueryResponse = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: PivotQueryResponse;
  };

  type RQueryDataResponse = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: QueryDataResponse;
  };

  type RString = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: string;
  };

  type RVisCardInfo = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: VisCardInfo;
  };

  type RVisDashboardInfo = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: VisDashboardInfo;
  };

  type RVisFilterOptionsResponse = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: VisFilterOptionsResponse;
  };

  type RVoid = {
    /** 200成功 */
    code?: number;
    msg?: string;
    data?: any;
  };

  type SaveDashGroupRequest = {
    id?: string;
    pid?: string;
    groupName: string;
    icon?: string;
    sortNum?: number;
    status?: string;
  };

  type toggleCardStatusParams = {
    cardId: string;
  };

  type toggleDashboardStatusParams = {
    dashboardId: string;
  };

  type toggleDashGroupStatusParams = {
    groupId: string;
  };

  type VisCardInfo = {
    /** 卡片 id */
    id: string;
    /** 卡片名 */
    cardName: string;
    /** 卡片描述 */
    cardDesc?: string;
    /** 数据集 id。richtext/url 可为 0 */
    datasetId?: string;
    /** 图表类型 */
    chartType: string;
    /** 查询配置 */
    queryJson?: string;
    /** 可视化配置 */
    visualJson?: string;
    /** 状态 */
    status: "EBL" | "DBL";
    /** 修改时间 */
    modifyAt?: string;
  };

  type VisCardSaveRequest = {
    /** 卡片 id */
    id?: string;
    /** 卡片名 */
    cardName: string;
    /** 卡片描述 */
    cardDesc?: string;
    /** 数据集 id。richtext/url 可不传 */
    datasetId?: string;
    /** 图表类型 */
    chartType: string;
    /** 状态 */
    status: "EBL" | "DBL";
    /** 查询配置。richtext/url 可不传 */
    queryJson?: string;
    /** 可视化配置 */
    visualJson: string;
  };

  type VisDashboardInfo = {
    /** 看板 id */
    id: string;
    /** 分组 id */
    groupId?: string;
    /** 分组名 */
    groupName?: string;
    /** 看板名 */
    dashName: string;
    /** 描述 */
    dashDesc?: string;
    /** 图标 */
    icon?: string;
    /** 状态 */
    status: "EBL" | "DBL";
    /** 看板配置 */
    configJson?: string;
    /** 看板卡片 */
    cards?: VisDashboardLayoutItem[];
    /** 修改时间 */
    modifyAt?: string;
  };

  type VisDashboardLayoutItem = {
    /** 卡片 id */
    cardId: string;
    /** 已废弃。布局在 configJson.widgets，保存时忽略 */
    layoutJson?: string;
    /** 卡片状态。详情返回，保存时忽略 */
    status?: "EBL" | "DBL";
  };

  type VisDashboardMetadataUpdateRequest = {
    /** 看板 id */
    id: string;
    /** 看板名 */
    dashName: string;
    /** 描述 */
    dashDesc?: string;
    /** 图标 */
    icon?: string;
    /** 分组 id。0 或不传表示挂到报表中心根下 */
    groupId?: string;
  };

  type VisDashboardRefInfo = {
    /** 看板 id */
    id: string;
    /** 看板名 */
    dashName: string;
    /** 状态 */
    status: "EBL" | "DBL";
    /** 修改时间 */
    modifyAt?: string;
  };

  type VisDashboardSaveRequest = {
    /** 看板 id。空为新建 */
    id?: string;
    /** 分组 id。0 或不传表示挂到报表中心根下 */
    groupId?: string;
    /** 看板名 */
    dashName: string;
    /** 描述 */
    dashDesc?: string;
    /** 图标 */
    icon?: string;
    /** 状态 */
    status: "EBL" | "DBL";
    /** 看板配置 */
    configJson?: string;
    /** 看板卡片成员。布局以 configJson.widgets 为准，此列表仅作兼容占位 */
    cards: VisDashboardLayoutItem[];
  };

  type VisDatasetInfo = {
    /** 数据集 id */
    id: string;
    /** 名称 */
    sqlName: string;
    /** 备注 */
    sqlDesc?: string;
  };

  type VisDatasource = {
    id?: string;
    createBy?: string;
    createAt?: string;
    modifyAt?: string;
    modifyBy?: string;
    sourceName?: string;
    dbType?: string;
    jdbcUrl?: string;
    username?: string;
    password?: string;
    status?: string;
  };

  type VisFilterOptionItem = {
    /** 展示名 */
    label: string;
    /** 值 */
    value: string;
  };

  type VisFilterOptionsRequest = {
    /** 数据集 id */
    datasetId: string;
    /** 取值字段。不传则按 label/value 等列名约定猜测 */
    field?: string;
    /** 展示字段。不传则与取值字段相同 */
    labelField?: string;
    /** 关键字，按 label / value 过滤 */
    keyword?: string;
    /** 按取值精确反查名称，不受预览条数限制。传入时必须同时指定 field */
    values?: string[];
    /** 返回条数，默认 50，最大 200。按值反查时忽略 */
    limit?: number;
  };

  type VisFilterOptionsResponse = {
    /** 选项 */
    list: VisFilterOptionItem[];
    /** 是否被截断 */
    truncated: boolean;
  };
}
