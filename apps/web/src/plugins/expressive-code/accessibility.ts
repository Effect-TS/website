import type { ExpressiveCodePlugin } from "@expressive-code/core"
import { select } from "@expressive-code/core/hast"

export function pluginCodeAccessibility(): ExpressiveCodePlugin {
  return {
    name: "Code accessibility",
    hooks: {
      postprocessRenderedBlock({ renderData }) {
        const pre = select("pre", renderData.blockAst)
        if (pre) pre.properties.tabIndex = 0
      },
    },
    // Expressive Code makes overflowing blocks focusable regions. Give each
    // region a distinct name, including blocks rendered through the Code component.
    jsModules: [
      String.raw`
      let observer;
      function labelCodeBlocks() {
        observer?.disconnect();
        const blocks = [...document.querySelectorAll('.expressive-code pre')];
        const labels = new Map(blocks.map((pre, index) => [pre, 'Code example ' + (index + 1)]));
        function label(pre) {
          if (pre.getAttribute('role') === 'region') {
            pre.setAttribute('aria-label', labels.get(pre));
          } else {
            pre.removeAttribute('aria-label');
          }
        }
        observer = new MutationObserver(records => records.forEach(record => label(record.target)));
        blocks.forEach(pre => {
          label(pre);
          observer.observe(pre, { attributes: true, attributeFilter: ['role'] });
        });
      }
      labelCodeBlocks();
      document.addEventListener('astro:page-load', labelCodeBlocks);
    `,
    ],
  }
}
