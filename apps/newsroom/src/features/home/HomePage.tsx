import { useNewsroom } from "@/state/store";
import AdminHome from "./AdminHome";
import EditorHome from "./EditorHome";
import ReporterHome from "./ReporterHome";

export default function Home() {
  const { actor } = useNewsroom();
  if (actor.role === "admin") return <AdminHome />;
  if (actor.role === "editor") return <EditorHome />;
  return <ReporterHome />;
}
