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
      <div className="max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-xl">
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-4">
            Contact
          </h1>
          <p className="text-zinc-500 leading-relaxed">
            お問い合わせフォームは現在設定中です。
            しばらくお待ちください。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-xl">
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-2">
          Contact
        </h1>
        <p className="text-zinc-500 text-sm sm:text-base mb-10 leading-relaxed">
          以下のフォームよりお問い合わせください。
          2,3日以内に確認しご返信いたします。
        </p>
        <ContactForm />
      </div>
    </div>
  )
}
