import { EditCategoryPage } from "@/features/admin";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <EditCategoryPage categoryId={id} />;
}
