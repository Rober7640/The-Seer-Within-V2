// A route whose WHOLE page is replaced per locale (the legal pages: French law
// changes what they must say, not just the words). The locale bundle registers
// a component under `key`; English renders `English` itself.
import type { ComponentType } from "react";
import { pick } from "@/lib/i18n";

export function localizedPage<P extends object>(key: string, English: ComponentType<P>): ComponentType<P> {
  function LocalizedPage(props: P) {
    const Page = pick<ComponentType<P>>(key, English);
    return <Page {...props} />;
  }
  LocalizedPage.displayName = `Localized(${English.displayName ?? English.name ?? key})`;
  return LocalizedPage;
}
