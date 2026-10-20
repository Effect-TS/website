export const MOTW_API_MODULES: Readonly<Record<string, string>> = {
  RcMap: "module-of-the-week/rcmap",
  "persistence/PersistedQueue": "module-of-the-week/persisted-queue",
  "cluster/Entity": "module-of-the-week/cluster-actors",
  "cluster/ClusterSchema": "module-of-the-week/cluster-actors",
  "cluster/Message": "module-of-the-week/cluster-messaging",
  "cluster/Envelope": "module-of-the-week/cluster-messaging",
  "cluster/Sharding": "module-of-the-week/cluster-delivery",
  "cluster/ShardId": "module-of-the-week/cluster-delivery",
}

export const motwForApiModule = (modulePath: string): string | undefined =>
  MOTW_API_MODULES[modulePath]
