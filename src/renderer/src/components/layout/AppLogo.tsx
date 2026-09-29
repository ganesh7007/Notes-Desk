import logo from '@/assets/logo.png'
import { cx } from '@/lib/utils'

interface AppLogoProps {
  size?: number
  rounded?: string
  className?: string
}

export function AppLogo({ size = 32, rounded = 'rounded-xl', className }: AppLogoProps): JSX.Element {
  return (
    <img
      src={logo}
      alt="NotesApp logo"
      width={size}
      height={size}
      draggable={false}
      className={cx('object-cover select-none', rounded, className)}
      style={{ width: size, height: size }}
    />
  )
}
