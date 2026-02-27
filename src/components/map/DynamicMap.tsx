'use client';

import dynamic from 'next/dynamic';

export const DynamicStationMap = dynamic(() => import('./StationMap'), { ssr: false });
export const DynamicRiverMap = dynamic(() => import('./RiverMap'), { ssr: false });
