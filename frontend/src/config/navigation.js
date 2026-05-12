import {
  ActivitySquare,
  Bug,
  LayoutDashboard,
  Radar,
  ScanSearch,
  Siren,
} from 'lucide-react';

export const navigationSections = [
  {
    label: 'Overview',
    items: [
      {
        path: '/dashboard',
        label: 'Dashboard',
        description: 'Executive SOC overview',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      {
        path: '/threat-hunting',
        label: 'Threat Hunting',
        description: 'Investigate Wazuh telemetry',
        icon: Radar,
      },
      {
        path: '/scan-details',
        label: 'Scan Details',
        description: 'Review Nessus findings',
        icon: ScanSearch,
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      {
        path: '/vulnerabilities',
        label: 'Vulnerabilities',
        description: 'Track exposure and remediation',
        icon: Bug,
      },
      {
        path: '/incidents',
        label: 'Incidents',
        description: 'Manage detections and response',
        icon: Siren,
      },
    ],
  },
];

const allNavigationItems = navigationSections.flatMap((section) => section.items);

export const findNavigationItem = (pathname) =>
  allNavigationItems.find((item) =>
    pathname === item.path || pathname.startsWith(`${item.path}/`)
  );

export const defaultPageDescriptor = {
  label: 'Security Operations',
  description: 'Operational visibility across incidents, vulnerabilities, and telemetry.',
  icon: ActivitySquare,
};
