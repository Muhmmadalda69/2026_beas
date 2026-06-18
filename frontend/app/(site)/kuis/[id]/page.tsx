import QuizPlayer from "@/components/QuizPlayer";

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <QuizPlayer levelId={id} />;
}
