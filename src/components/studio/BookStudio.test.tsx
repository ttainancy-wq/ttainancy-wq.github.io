import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { builtInBooks } from '../../data/books'
import type { BookPage } from '../../types/book'
import { BookStudio, PageEditor } from './BookStudio'

function PageHarness() {
  const [pages, setPages] = useState<BookPage[]>(structuredClone(builtInBooks[0].pages.slice(0, 2)))
  return (
    <>
      <output data-testid="order">{pages.map((page) => page.id).join('|')}</output>
      <PageEditor pages={pages} onChange={setPages} />
    </>
  )
}

describe('Book Studio', () => {
  it('adds and reorders pages with touch-friendly buttons', () => {
    render(<PageHarness />)
    const initial = screen.getByTestId('order').textContent
    fireEvent.click(screen.getByRole('button', { name: '↓ 后移' }))
    expect(screen.getByTestId('order').textContent).not.toBe(initial)
    fireEvent.click(screen.getByRole('button', { name: '+ 添加页面' }))
    expect(screen.getAllByRole('button', { name: /Write a new story senten/ })).toHaveLength(1)
  })

  it('creates, duplicates, validates, previews and exposes import/export controls', () => {
    const onBooksChange = () => undefined
    render(<BookStudio books={structuredClone(builtInBooks)} onBooksChange={onBooksChange} />)
    expect(screen.getByRole('heading', { name: /Book Studio/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /创建新绘本/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /复制为模板/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /导入 JSON/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /导出 JSON/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /校验完整性/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '儿童端预览' }))
    expect(screen.getByText('Brown Bear', { selector: 'h2' })).toBeInTheDocument()
  })
})
