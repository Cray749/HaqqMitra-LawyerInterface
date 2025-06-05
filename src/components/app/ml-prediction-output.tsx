
"use client";

import type { MlOutputData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Clock, AlertTriangle, ThumbsUp, TrendingUp, TrendingDown } from 'lucide-react'; // Removed ListChecks
import * as React from 'react';

interface MlPredictionOutputProps {
  isLoading: boolean;
  data: MlOutputData | null;
}

const MetricCard: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode; className?: string }> = ({ title, icon: Icon, children, className }) => (
  <Card className={`shadow-lg ${className}`}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-5 w-5 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {children}
    </CardContent>
  </Card>
);

export function MlPredictionOutput({ isLoading, data }: MlPredictionOutputProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="font-headline text-2xl font-semibold mb-4">ML Predictions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => ( // Adjusted skeleton count
            <Card key={i} className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-1/2 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2"> 
            {[...Array(2)].map((_,i) => ( // Adjusted for 2 text cards
                 <Card key={`sk-text-${i}`} className="shadow-lg">
                    <CardHeader><Skeleton className="h-6 w-2/5" /></CardHeader>
                    <CardContent><Skeleton className="h-20 w-full" /></CardContent>
                 </Card>
            ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return null; 
  }

  const parseListString = (listString: string | undefined): string[] => {
    if (!listString || typeof listString !== 'string') return [];
    return listString.split(/\n(?=\s*[-*]|\s*\d+\.\s*)/) 
      .map(item => item.trim().replace(/^[-*]|\d+\.\s*/, '').trim()) 
      .filter(item => item.length > 0);
  };

  const strongPointsList = parseListString(data.strongPoints);
  const weakPointsList = parseListString(data.weakPoints);

  return (
    <div className="space-y-6">
      <h2 className="font-headline text-2xl font-semibold">ML Predictions</h2>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Estimated Cost" icon={DollarSign}>
          <div className="text-2xl font-bold text-primary">{data.estimatedCost}</div>
        </MetricCard>

        <MetricCard title="Expected Duration" icon={Clock}>
          <div className="text-2xl font-bold">{data.expectedDuration}</div>
        </MetricCard>

        <MetricCard title="Win Probability" icon={TrendingUp}>
          <div className="text-2xl font-bold text-green-600">{data.winProbability}%</div>
          <Progress value={data.winProbability} className="h-2 mt-2 bg-green-600/20 [&>div]:bg-green-600" />
        </MetricCard>

        <MetricCard title="Loss Probability" icon={TrendingDown}>
          <div className="text-2xl font-bold text-red-600">{data.lossProbability}%</div>
          <Progress value={data.lossProbability} className="h-2 mt-2 bg-red-600/20 [&>div]:bg-red-600" />
        </MetricCard>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-lg font-medium">
              <ThumbsUp className="h-5 w-5 mr-2 text-green-600" /> Strong Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            {strongPointsList.length > 0 ? (
              <ScrollArea className="h-48 custom-scrollbar pr-3">
                <ul className="space-y-2 list-disc list-inside pl-2 text-sm">
                  {strongPointsList.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">No specific strong points identified or data not available.</p>
            )}
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-lg font-medium">
              <AlertTriangle className="h-5 w-5 mr-2 text-destructive" /> Weak Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weakPointsList.length > 0 ? (
              <ScrollArea className="h-48 custom-scrollbar pr-3">
                <ul className="space-y-2 list-disc list-inside pl-2 text-sm">
                  {weakPointsList.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">No specific weak points identified or data not available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
