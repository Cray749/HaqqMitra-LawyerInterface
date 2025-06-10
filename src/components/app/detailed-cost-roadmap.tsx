
"use client";

import type { DetailedCostRoadmapOutput, CaseStageCost } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { IndianRupee, Milestone, AlertCircle, GitCommitVertical } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';

interface DetailedCostRoadmapProps {
  roadmapData: DetailedCostRoadmapOutput | null;
  isLoading: boolean;
}

const StageSkeleton: React.FC = () => (
  <div className="flex">
    <div className="flex flex-col items-center mr-4">
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="h-16 w-0.5 mt-1" />
    </div>
    <Card className="mb-6 flex-1 opacity-50">
      <CardHeader>
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-5/6 mb-3" />
        <Skeleton className="h-5 w-1/3" />
      </CardContent>
    </Card>
  </div>
);

export function DetailedCostRoadmap({ roadmapData, isLoading }: DetailedCostRoadmapProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 mt-4">
        <StageSkeleton />
        <StageSkeleton />
        <StageSkeleton />
      </div>
    );
  }

  if (!roadmapData || (!roadmapData.stages?.length && !roadmapData.error)) {
    return <p className="text-sm text-muted-foreground mt-4 text-center py-6">Click the button above to generate the detailed cost roadmap.</p>;
  }

  if (roadmapData.error) {
    return (
      <Card className="mt-4 border-destructive bg-destructive/10">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <AlertCircle className="mr-2 h-5 w-5" /> Error Generating Roadmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive-foreground">{roadmapData.error}</p>
          { (roadmapData.citations || roadmapData.searchResults) && (
             <div className="mt-2 text-xs opacity-80 text-destructive-foreground/70">
                {roadmapData.citations && roadmapData.citations.length > 0 && (
                    <div><strong>Citations:</strong> {roadmapData.citations.map((c:any, i:number) => <span key={i}>{c.text || 'source'}</span> )}</div>
                )}
                {roadmapData.searchResults && roadmapData.searchResults.length > 0 && (
                    <div><strong>Sources:</strong> {roadmapData.searchResults.map((s:any, i:number) => <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-destructive-foreground/50">{s.title || 'link'}</a> )}</div>
                )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="mt-6 relative">
      {/* Vertical line for timeline */}
      {roadmapData.stages.length > 1 && (
        <div className="absolute left-[15px] top-[16px] bottom-[16px] w-0.5 bg-border -z-10" />
      )}

      {roadmapData.stages.map((stage, index) => (
        <div key={stage.id} className="flex items-start mb-8 relative">
          <div className="flex flex-col items-center mr-6 z-0">
            <div className={cn(
                "flex items-center justify-center h-8 w-8 rounded-full border-2",
                 index % 2 === 0 ? "bg-primary/20 border-primary" : "bg-accent/20 border-accent"
              )}
            >
              <Milestone className={cn("h-4 w-4", index % 2 === 0 ? "text-primary" : "text-accent")} />
            </div>
          </div>

          <Card className="flex-1 shadow-lg hover:shadow-xl transition-shadow duration-300 border-l-4" 
                style={{ borderColor: index % 2 === 0 ? 'hsl(var(--primary))' : 'hsl(var(--accent))' }}>
            <CardHeader>
              <CardTitle className="font-headline text-lg">{stage.stageName}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{stage.description}</p>
              <div className="flex items-center text-md font-semibold">
                <IndianRupee className="mr-1.5 h-5 w-5 text-green-600" />
                <span className="text-green-700">{stage.estimatedCostINR}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
       { (roadmapData.citations || roadmapData.searchResults) && (
             <div className="mt-4 text-xs text-muted-foreground">
                {roadmapData.citations && roadmapData.citations.length > 0 && (
                    <div><strong>Citations:</strong> {roadmapData.citations.map((c:any, i:number) => <span key={i}>{c.text || 'source'}</span> )}</div>
                )}
                {roadmapData.searchResults && roadmapData.searchResults.length > 0 && (
                    <div><strong>Sources:</strong> {roadmapData.searchResults.map((s:any, i:number) => <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">{s.title || 'link'}</a> )}</div>
                )}
            </div>
        )}
    </div>
  );
}
