import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { getFirestore, doc, setDoc, addDoc, collection } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

const db = getFirestore();

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  collegeName: z.string().min(2, "College name must be at least 2 characters."),
  logoUrl: z.string().url("Please enter a valid URL."),
});

interface Team {
  id?: string;
  name: string;
  collegeName: string;
  logoUrl: string;
}

interface TeamFormProps {
  team?: Team;
  onFinished: () => void;
}

const TeamForm = ({ team, onFinished }: TeamFormProps) => {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: team?.name || "",
      collegeName: team?.collegeName || "",
      logoUrl: team?.logoUrl || "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (team) {
        // Update existing team
        const teamRef = doc(db, "teams", team.id!);
        await setDoc(teamRef, values, { merge: true });
        toast({ title: "Team updated", description: "The team has been successfully updated." });
      } else {
        // Create new team
        await addDoc(collection(db, "teams"), values);
        toast({ title: "Team created", description: "The team has been successfully created." });
      }
      onFinished();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error saving team",
        description: "There was a problem saving the team.",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., The Lions" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="collegeName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>College Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., State University" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="logoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Logo URL</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/logo.png" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save Team"}
        </Button>
      </form>
    </Form>
  );
};

export default TeamForm;
