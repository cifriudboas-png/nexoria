import { createFileRoute } from "@tanstack/react-router";
import NexoriaApp from "@/components/NexoriaApp";
import PreferencesProvider from "@/components/PreferencesProvider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEXORIA — Crie sua conta" },
      {
        name: "description",
        content: "Crie sua conta na NEXORIA, monte seu personagem e jogue experiências com seus amigos.",
      },
      { property: "og:title", content: "NEXORIA — Crie sua conta" },
      {
        property: "og:description",
        content: "Crie sua conta na NEXORIA, monte seu personagem e jogue experiências com seus amigos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <PreferencesProvider>
      <NexoriaApp />
    </PreferencesProvider>
  );
}
