import type { Metadata } from "next";
import { getPosts } from "@/lib/content";
import PostList from "@/components/PostList";

export const metadata: Metadata = { title: "Blog" };

export default function BlogPage() {
  const posts = getPosts().map(({ body: _body, ...rest }) => rest);
  return <PostList posts={posts} />;
}
