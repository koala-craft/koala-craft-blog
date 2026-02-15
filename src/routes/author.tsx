import { createFileRoute, Link } from '@tanstack/react-router'
import { getAuthorPageData } from '~/features/pageData/api'
import { getBlogImageSrc } from '~/shared/lib/blogImageUrl'
import { SkillStacks } from '~/shared/components/SkillStacks'
import { WorkSection } from '~/shared/components/WorkSection'

export const Route = createFileRoute('/author')({
  loader: () => getAuthorPageData(),
  component: AuthorPage,
})

function AuthorPage() {
  const { authorIcon, authorName, authorOneLiner, zennUsername, personalItems, professionalItems, sidejobItems } = Route.useLoaderData()
  const displayName = authorName || zennUsername || 'Author'

  return (
    <div className="max-w-[96rem] mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Author</h1>
      <div className="prose prose-invert prose-zinc max-w-none space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {authorIcon && (
            <img
              src={getBlogImageSrc(authorIcon)}
              alt=""
              width={96}
              height={96}
              loading="eager"
              decoding="async"
              className="w-24 h-24 rounded-full object-cover border-2 border-zinc-700 shrink-0"
            />
          )}
          <p className="text-lg text-zinc-300 leading-relaxed">
            This site is maintained by{' '}
            <span className="font-semibold text-zinc-100">{displayName}</span>.
          </p>
        </div>
        {authorOneLiner && (
          <p className="text-base text-zinc-300">
            {authorOneLiner}
          </p>
        )}
        {zennUsername && (
          <div className="flex flex-wrap gap-4 pt-4">
            <a
              href={`https://github.com/${zennUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-cyan-400 hover:underline"
            >
              GitHub ↗
            </a>
            <a
              href={`https://zenn.dev/${zennUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-cyan-400 hover:underline"
            >
              Zenn ↗
            </a>
          </div>
        )}
      </div>
      <WorkSection
        personalItems={personalItems}
        professionalItems={professionalItems}
        sidejobItems={sidejobItems}
      />
      <div className="mt-8">
        <SkillStacks />
      </div>
      <p className="pt-8">
        <Link to="/" className="text-cyan-400 hover:underline">
          ← Back to Home
        </Link>
      </p>
    </div>
  )
}
