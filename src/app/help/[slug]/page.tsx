import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import HelpBlocks from "../HelpBlocks";
import { getArticle, getCategory, type HelpArticle } from "@/lib/help-content";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const article = getArticle(slug);
    return {
        title: article ? `${article.title} — HayFlow Help` : "Help — HayFlow",
        description: article?.summary,
    };
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const article = getArticle(slug);
    if (!article) notFound();

    const category = getCategory(article.category);
    const related = (article.related ?? [])
        .map((s) => getArticle(s))
        .filter((a): a is HelpArticle => Boolean(a));

    return (
        <div>
            <PageHeader
                backHref="/help"
                backLabel="Help Center"
                eyebrow={category?.label}
                title={article.title}
                subtitle={article.summary}
            />

            <article className="surface-card">
                <HelpBlocks blocks={article.body} />
            </article>

            {related.length > 0 && (
                <section className="mt-6">
                    <h2 className="text-eyebrow mb-3">Related</h2>
                    <div className="space-y-2">
                        {related.map((r) => (
                            <Link key={r.slug} href={`/help/${r.slug}`} className="glass-card-link p-3 block">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="font-bold" style={{ color: 'var(--text-main)' }}>{r.title}</span>
                                    <ArrowRight size={16} className="flex-shrink-0" style={{ color: 'var(--primary)' }} />
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
