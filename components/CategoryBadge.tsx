import type { Category } from '@/lib/types'

interface Props {
  category: Category | null | undefined
  size?: 'sm' | 'md'
}

export function CategoryDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      style={{ width: 10, height: 10, background: color }}
    />
  )
}

export function CategoryBadge({ category, size = 'sm' }: Props) {
  if (!category) return null
  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${pad} whitespace-nowrap`}
      style={{
        background: category.color + '22',
        color: category.color,
        border: `1px solid ${category.color}55`,
      }}
    >
      <CategoryDot color={category.color} />
      {category.name}
    </span>
  )
}
