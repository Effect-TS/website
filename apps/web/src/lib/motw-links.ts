export const MOTW_API_MODULES: Readonly<Record<string, string>> = {
  RcMap: "module-of-the-week/rcmap",
  "unstable/persistence/PersistedQueue": "module-of-the-week/persisted-queue",
  "unstable/cluster/Entity": "module-of-the-week/cluster-actors",
  "unstable/cluster/ClusterSchema": "module-of-the-week/cluster-actors",
  "unstable/cluster/Message": "module-of-the-week/cluster-messaging",
  "unstable/cluster/Envelope": "module-of-the-week/cluster-messaging",
  "unstable/cluster/Sharding": "module-of-the-week/cluster-delivery",
  "unstable/cluster/ShardId": "module-of-the-week/cluster-delivery",
}

export const motwForApiModule = (modulePath: string): string | undefined =>
  MOTW_API_MODULES[modulePath]
