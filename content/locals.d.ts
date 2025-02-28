declare namespace App {
  type StarlightLocals = import("@astrojs/starlight").StarlightLocals

  interface Locals extends StarlightLocals {
    /**
     * Route data for the Cause & Effect podcast.
     */
    effectPodcast: import("./src/plugins/starlight/podcast/data").PodcastData
  }
}
