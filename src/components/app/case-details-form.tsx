
"use client";

import type { CaseDetails } from '@/types';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CalendarIcon, Send } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import * as React from 'react';

const caseDetailsSchema = z.object({
  caseTitle: z.string().min(1, "Case title is required"),
  courtTribunal: z.string().min(1, "Court/Tribunal is required"),
  jurisdiction: z.string().min(1, "Jurisdiction is required"),
  caseType: z.string().min(1, "Case type is required"),
  plaintiffsDefendants: z.string().min(1, "Plaintiffs/Defendants are required"),
  briefDescription: z.string().min(1, "Brief description is required"),
  filingDate: z.date().optional(),
  nextHearingDate: z.date().optional(),
  enableMlPrediction: z.boolean(),
});

interface CaseDetailsFormProps {
  onSubmit: (data: CaseDetails) => void;
  initialData: CaseDetails;
  isSubmitting?: boolean;
}

const caseTypeOptions = ["Criminal", "Civil", "Patent", "Family", "Corporate", "Other"];

export function CaseDetailsForm({ onSubmit, initialData, isSubmitting }: CaseDetailsFormProps) {
  const form = useForm<CaseDetails>({
    resolver: zodResolver(caseDetailsSchema),
    defaultValues: initialData,
  });

  React.useEffect(() => {
    form.reset(initialData);
  }, [initialData, form]);

  const handleSubmit = (data: CaseDetails) => {
    onSubmit(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Case Details</CardTitle>
        <CardDescription>Enter the specifics of the case below.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="caseTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Case Title</FormLabel>
                  <FormControl><Input placeholder="e.g., Smith v. Jones" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="courtTribunal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Court/Tribunal</FormLabel>
                    <FormControl><Input placeholder="e.g., Supreme Court" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="jurisdiction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jurisdiction</FormLabel>
                    <FormControl><Input placeholder="e.g., State of California" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="caseType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Case Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select case type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {caseTypeOptions.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="plaintiffsDefendants"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plaintiffs / Defendants</FormLabel>
                  <FormControl><Textarea placeholder="List names, one per line" {...field} rows={3} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="briefDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brief Description</FormLabel>
                  <FormControl><Textarea placeholder="Summarize the case" {...field} rows={5} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="filingDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Filing Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nextHearingDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Next Hearing Date</FormLabel>
                     <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="enableMlPrediction"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Enable ML Prediction</FormLabel>
                    <FormDescription>Allow AI to generate predictions based on this data.</FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isSubmitting}>
              <Send className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Submitting...' : 'Submit for Prediction'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
