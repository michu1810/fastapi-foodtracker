import React from 'react';
import { Sparklines, SparklinesLine } from 'react-sparklines';

export default function Sparkline({ data }: { data: number[] }) {
  return (
    <Sparklines data={data} width={200} height={60}>
      <SparklinesLine style={{ stroke: '#10B981', strokeWidth: 2, fill: 'none' }} />
    </Sparklines>
  );
}
