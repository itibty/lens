declare namespace VIS {
  /** OpenAPI 暂未完整描述。放在 vis/ 外，避免 generate 覆盖。 */
  type OptionString = NameValue;
  type ConfSqlFieldItem = ConfSqlFieldInfo;

  type Info = {
    taskName?: string;
    time?: string;
    percent?: string;
  };

  type FieldInfo = {
    infoType: string;
    name: string;
    comment?: string;
    type: string;
    typeDesc: string;
    isPk: boolean;
    nullable: boolean;
    defaultValue?: string;
    isAutoIncrement?: boolean;
  };

  type IndexInfo = {
    infoType: string;
    name: string;
    isUnique: boolean;
    fieldDesc: string;
  };

  type TableInfo = {
    infoType: string;
    name: string;
    comment?: string;
    fieldInfos?: FieldInfo[];
    indexInfos?: IndexInfo[];
  };

  type SchemaInfo = {
    infoType: string;
    name: string;
    comment?: string;
    dbType: string;
    tableInfos?: TableInfo[];
  };

  type ManageTreeNode = ManageNode;
  type EditDashboardMetaRequest = VisDashboardMetadataUpdateRequest;
}
