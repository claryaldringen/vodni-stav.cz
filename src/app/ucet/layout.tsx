import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Můj účet',
  description: 'Správa účtu, API klíčů a předplatného na vodnistav.cz.',
  robots: { index: false, follow: false },
};

const UcetLayout = ({ children }: { children: React.ReactNode }) => children;

export default UcetLayout;
