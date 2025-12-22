import UserChangelog from './UserChangelog';

export default async function Page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <UserChangelog username={decodeURIComponent(username)} />;
}
