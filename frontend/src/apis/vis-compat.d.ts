declare namespace VIS {
  /** OpenAPI 暂未完整描述。放在 vis/ 外，避免 generate 覆盖。 */
  type OptionString = NameValue
  type ConfSqlFieldItem = ConfSqlFieldInfo

  type Info = {
    taskName?: string
    time?: string
    percent?: string
  }

  type ManageTreeNode = ManageNode
  type EditDashboardMetaRequest = VisDashboardMetadataUpdateRequest
}
