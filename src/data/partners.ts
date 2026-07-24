export interface PartnerStat {
  value: string
  label: string
}

export interface PartnerService {
  title: string
  description: string
  eyebrow?: string
  icon?: string
  cta?: { label: string; href: string }
}

export interface TrainingOutcome {
  title: string
  detail: string
  icon?: string
}

export interface PartnerTraining {
  title: string
  description: string
  topics: TrainingOutcome[]
  cta: { label: string; href: string }
}

export interface PartnerDifferentiator {
  eyebrow: string
  title: string
  description: string
  link?: { label: string; href: string }
}

export interface PartnerFAQ {
  question: string
  answer: string
}

export interface PartnerTestimonial {
  quote: string
  author: string
}

export interface PartnerCTA {
  label: string
  href: string
}

export interface Partner {
  id: string
  name: string
  description: string
  longDescription: string
  websiteUrl: string
  logoPath: string
  featured: boolean
  language: string
  languageFlag: string
  region: string
  tier?: "premier" | "standard"
  brandColor?: string
  contactEmail?: string
  tagline?: string
  ctaPrimary?: PartnerCTA
  ctaSecondary?: PartnerCTA
  stats?: PartnerStat[]
  testimonials?: PartnerTestimonial[]
  services?: PartnerService[]
  training?: PartnerTraining
  differentiators?: PartnerDifferentiator[]
  faqs?: PartnerFAQ[]
}

export const PARTNERS: Partner[] = [
  {
    id: "ziverge",
    name: "Ziverge",
    description:
      "Technology services firm specializing in distributed systems, AI/ML, and cloud-native solutions.",
    longDescription:
      "Ziverge provides engineering expertise across distributed systems, AI/ML pipelines, and cloud-native architecture. They work with enterprise clients to build scalable, production-grade software using functional programming and Effect.",
    websiteUrl: "https://www.ziverge.com/",
    logoPath: "/assets/partner-logos/ziverge.svg",
    featured: true,
    language: "English",
    languageFlag: "\u{1F1EC}\u{1F1E7}",
    region: "Global",
    tier: "premier",
    brandColor: "#FF634B",
    contactEmail: "contact@ziverge.com",
    tagline:
      "Effect implementation, team extension, and training — everything teams need to ship Effect in production.",
    ctaPrimary: { label: "Get in touch", href: "#contact" },
    stats: [
      { value: "273+", label: "Projects Delivered" },
      { value: "27+", label: "Clients Served" },
      { value: "15+", label: "Countries" },
    ],
    testimonials: [
      {
        quote:
          "Ziverge brought a level of functional programming depth we couldn't hire for internally. The engagement moved fast and the output was production quality from day one.",
        author: "Engineering Leader, Coralogix",
      },
      {
        quote:
          "In the early days of Effect I reached out to John for advice, and his insights have been essential for the initial design of Effect. As part of that collaboration I got the opportunity to participate in some of his ZIO workshops. I was very inspired by the quality and dedication that John puts into developing training material, and by the structure of his workshops. I look forward to seeing him do the same for Effect in TypeScript.",
        author: "Michael Arnaldi, Creator of Effect",
      },
    ],
    services: [
      {
        title: "Implementation & Consulting",
        description:
          "Hands-on Effect adoption for your production codebase. Ziverge assesses your stack, designs the migration path, and implements — with the depth that only comes from building Effect systems for over a decade.",
        icon: "Wrench",
        cta: { label: "Start a conversation", href: "#contact" },
      },
      {
        title: "Team Extension",
        description:
          "Embed Ziverge engineers alongside your team. They work in your repos, your ceremonies, your reviews — accelerating Effect adoption while your engineers develop fluency alongside them.",
        icon: "Users",
        cta: { label: "Embed an engineer", href: "#contact" },
      },
      {
        title: "Training",
        description:
          "Structured Effect training from foundational concepts to advanced patterns — fibers, typed errors, dependency injection, and agent-native workflows.",
        eyebrow: "Coming soon",
        icon: "GraduationCap",
        cta: { label: "Get notified", href: "#training" },
      },
      {
        title: "Open-Source & Commercial Support",
        description:
          "Ongoing support for teams running Effect in production, from open-source maintenance to commercial support contracts.",
        icon: "LifeBuoy",
        cta: { label: "Get support", href: "#contact" },
      },
    ],
    training: {
      title: "Effect Training",
      description: "Structured training from Effect fundamentals to production-ready expertise.",
      topics: [
        {
          title: "Concurrent systems",
          detail: "Fibers, scheduling, structured concurrency",
          icon: "GitBranch",
        },
        {
          title: "Type-safe failure modes",
          detail: "Typed errors, recovery, observability",
          icon: "ShieldCheck",
        },
        {
          title: "Production reliability",
          detail: "Resource safety, dependency injection, lifecycle management",
          icon: "Rocket",
        },
        {
          title: "Agent-native patterns",
          detail: "AI workflows, deterministic execution",
          icon: "Bot",
        },
      ],
      cta: { label: "Reserve your seat", href: "#contact" },
    },
    differentiators: [
      {
        eyebrow: "Expertise",
        title: "Deepest Effect expertise",
        description: "Over a decade of building effect systems, from ZIO to Effect.",
        link: {
          label: "Why Effect is more important than ZIO — John A. De Goes",
          href: "https://www.youtube.com/watch?v=Ei6VTwhI8QQ",
        },
      },
      {
        eyebrow: "Delivery",
        title: "Enterprise-grade delivery",
        description:
          "Effect expertise paired with the engineering discipline to ship: architecture, reviews, and production readiness.",
      },
      {
        eyebrow: "Training",
        title: "Proven training pedigree",
        description:
          "Structured workshops from fundamentals to advanced patterns, endorsed by Effectful, the team behind Effect.",
      },
    ],
    faqs: [
      {
        question: "Do I need prior Effect experience to work with Ziverge?",
        answer:
          "No. We work with teams at every stage — from evaluating Effect for the first time to teams already running it in production who want to deepen adoption or optimize existing code. We'll scope the engagement to where you actually are.",
      },
      {
        question: "What does a typical consulting engagement look like?",
        answer:
          "Most engagements start with a scoping conversation, followed by a short discovery phase to understand your codebase and goals. From there we move to either an implementation sprint, an embedded team extension, or a structured training program — depending on what creates the most leverage for you.",
      },
      {
        question: "What will the certification cover, and who endorses it?",
        answer:
          "The certification covers core Effect concepts: fibers, typed errors, dependency injection, scheduling, resource safety, and agent-native workflows. It is endorsed by Effectful — the company behind Effect — making it the only certification with that backing.",
      },
      {
        question: "How is the training delivered, and how long does it take?",
        answer:
          "Training is online-first with recurring cohorts. It is designed to be agent-native — meaning the tools and workflows taught reflect how engineers actually work with AI assistance today. Duration depends on the track.",
      },
      {
        question: "Can Ziverge embed engineers into our existing team?",
        answer:
          "Yes — team extension is one of our core offerings. Ziverge engineers join your ceremonies, your repos, and your review process the way your senior hires would. They bring Effect fluency and agentic coding workflows, and operate under lead-level ownership standards from day one.",
      },
    ],
  },
  {
    id: "evryg",
    name: "evryg",
    description:
      "Consulting firm specializing in digital transformation, bridging business and technology.",
    longDescription:
      "evryg bridges the gap between business and technology, from organizational strategy to implementation. With 60% of their consultants having over 10 years of experience, they specialize in digital transformation projects powered by Effect.",
    websiteUrl: "https://www.evryg.com/en",
    logoPath: "/assets/partner-logos/evryg.svg",
    featured: false,
    language: "French",
    languageFlag: "\u{1F1EB}\u{1F1F7}",
    region: "France",
  },
  {
    id: "doubleloop",
    name: "Double Loop",
    description:
      "Software consultancy specializing in functional programming and Effect for building reliable systems.",
    longDescription:
      "Double Loop helps teams adopt Effect and functional programming to build robust, maintainable software. Based in Italy, they bring deep expertise in TypeScript and Effect to deliver production-grade solutions.",
    websiteUrl: "https://doubleloop.io/",
    logoPath: "/assets/partner-logos/doubleloop.svg",
    featured: false,
    language: "Italian",
    languageFlag: "\u{1F1EE}\u{1F1F9}",
    region: "Italy",
  },
]
