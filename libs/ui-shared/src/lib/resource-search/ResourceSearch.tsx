import { FC } from 'react';

import ResourceSearchBar from '../search-bar';
import ResourceCard from '../resource-card';

export interface ResourceSearchProps {}

interface Resource {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
}

const resources: Resource[] = [
  {
    id: '1',
    title: 'Student Counseling Services',
    description:
      'Professional counseling services available 24/7 for all students dealing with stress, anxiety, or other mental health concerns. Our licensed counselors provide confidential support through individual sessions, group therapy, and crisis intervention. We offer both in-person and virtual appointments to accommodate your schedule and comfort level. Services include stress management, depression counseling, anxiety support, relationship guidance, and academic pressure management.',
    category: 'Mental Health',
    tags: ['counseling', 'therapy', 'stress'],
  },
  {
    id: '2',
    title: 'Financial Aid Workshop',
    description:
      'Learn about scholarships, grants, and managing your student finances effectively. Our comprehensive workshop covers FAFSA application processes, scholarship search strategies, budgeting techniques, and student loan management. Expert financial advisors will guide you through various funding options, debt management strategies, and provide personalized advice for your financial situation. Includes hands-on sessions for completing aid applications and creating personal budget plans.',
    category: 'Financial',
    tags: ['financial aid', 'scholarships'],
  },
  {
    id: '3',
    title: 'Career Development Center',
    description:
      'Get help with resume writing, interview preparation, and job search strategies. Our career counselors provide one-on-one guidance for career planning, professional development, and job placement. Services include resume and cover letter reviews, mock interviews, networking workshops, and access to exclusive job boards. We also organize career fairs, industry networking events, and maintain partnerships with leading employers across various sectors.',
    category: 'Career',
    tags: ['career', 'jobs', 'resume'],
  },
  {
    id: '4',
    title: 'Study Skills Workshop Series',
    description:
      'A series of workshops covering effective study techniques, time management, and exam preparation. Learn research-backed methods for better retention, note-taking strategies, and test-taking skills. Our expert academic coaches will help you develop personalized study plans, teach memory enhancement techniques, and provide strategies for managing academic workload. Includes practical sessions on digital tools for studying, group study effectiveness, and handling academic stress.',
    category: 'Academic',
    tags: ['study skills', 'academic'],
  },
  {
    id: '5',
    title: 'Wellness Center',
    description:
      'Access to fitness facilities, health screenings, and wellness programs designed to support your physical and mental well-being. Our state-of-the-art facility includes modern exercise equipment, group fitness classes, and personal training services. We offer nutritional counseling, stress management workshops, and preventive health screenings. Regular wellness events include yoga sessions, meditation workshops, and health awareness campaigns.',
    category: 'Physical Health',
    tags: ['fitness', 'health', 'wellness'],
  },
  {
    id: '6',
    title: 'Student Support Groups',
    description:
      'Join peer-led support groups focusing on various topics and shared experiences. Our facilitated groups provide safe spaces for discussing common challenges, sharing coping strategies, and building supportive relationships. Groups cover topics like academic stress, cultural adjustment, LGBTQ+ support, and general mental wellness. Regular meetings are scheduled throughout the semester, with both in-person and virtual options available.',
    category: 'Social',
    tags: ['support', 'community'],
  },
];

const ResourceSearch: FC<ResourceSearchProps> = () => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="w-[60%] flex flex-col gap-4 items-center">
        <div className="w-full flex flex-col gap-2 items-center justify-center">
          <span>Ally</span>
          <span className="text-[#000]">
            Guidance, safety, and support — whenever you need it.
          </span>
          <ResourceSearchBar />
        </div>
        <div className="h-[calc(100vh-400px)] overflow-y-auto flex flex-col gap-4 items-center mt-4">
          {resources.map((resource) => (
            <ResourceCard
              key={resource.id}
              title={resource.title}
              description={resource.description}
              category={resource.category}
              tags={resource.tags}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResourceSearch;
