import type { ComponentProps, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

/** <form> that navigates client-side to `to`, passing the search box value as ?q=. */
export default function RouterForm({ to, ...props }: { to: string } & ComponentProps<'form'>) {
  const navigate = useNavigate()
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const input = e.currentTarget.querySelector<HTMLInputElement>('input[type=search], input[type=text]')
    const q = input?.value.trim()
    navigate(q ? `${to}?q=${encodeURIComponent(q)}` : to)
  }
  return <form {...props} onSubmit={onSubmit} />
}
