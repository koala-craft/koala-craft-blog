import { createFileRoute } from '@tanstack/react-router'
import { ContactForm } from '~/features/contact/ContactForm'
import { getContactAvailable } from '~/features/contact/contactApi'

export const Route = createFileRoute('/contact')({
  component: ContactPage,
  loader: async () => {
    const contactAvailable = await getContactAvailable()
    return { contactAvailable }
  },
})

function ContactPage() {
  const { contactAvailable } = Route.useLoaderData()

  if (!contactAvailable) {
    return (
      <div className="max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
          Contact
        </h1>
        <p className="mt-2 text-zinc-500">
          お問い合わせフォームは現在設定中です。
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
          Contact
        </h1>
        <p className="mt-1.5 text-zinc-400 text-sm sm:text-base">
          気軽にどうぞ。2〜3日以内にご返信いたします。
        </p>
        <div className="mt-10">
          <ContactForm />
        </div>
      </div>
    </div>
  )
}
