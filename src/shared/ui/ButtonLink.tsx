import { Button, type ButtonProps } from '@alfalab/core-components/button/modern';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

interface ButtonLinkProps {
  to: string;
  children: ReactNode;
  view?: ButtonProps['view'];
  size?: ButtonProps['size'];
  block?: boolean;
  className?: string;
}

/** Кнопка-ссылка роутера: Button из core-components сам передаёт href в `to` у Link. */
export function ButtonLink({ to, children, ...props }: ButtonLinkProps) {
  return (
    <Button {...props} Component={Link} href={to}>
      {children}
    </Button>
  );
}
