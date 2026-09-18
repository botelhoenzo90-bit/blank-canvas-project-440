import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Página em branco" },
      {
        name: "description",
        content: "Página limpa e completamente vazia.",
      },
      { property: "og:title", content: "Página em branco" },
      {
        property: "og:description",
        content: "Página limpa e completamente vazia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BlankPage,
});

function BlankPage() {
  return <main className="min-h-screen bg-white" aria-label="Página em branco" />;
}
