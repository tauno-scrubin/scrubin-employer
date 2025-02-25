<script lang="ts">
    import * as Card from "$lib/components/ui/card/index.js";
    import * as Tabs from "$lib/components/ui/tabs/index.js";
    import Button from "$lib/components/ui/button/button.svelte";
    import Badge from "$lib/components/ui/badge/badge.svelte";
    import { 
        Briefcase, 
        MapPin, 
        Clock, 
        DollarSign, 
        GraduationCap, 
        Languages, 
        Calendar, 
        Car, 
        Building, 
        ArrowLeft,
        Users
    } from "lucide-svelte";
    import { page } from "$app/stores";
    import SearchView from "$lib/components/dashboard/searchView.svelte";

    let { data } = $props();
    let hunt = $derived(data.hunt);
    

</script>

<div class="container mx-auto py-6 space-y-6">
    <div class="flex items-center gap-4">
        <a href="/dashboard/hunts">
            <Button variant="outline" size="icon" class="h-9 w-9">
                <ArrowLeft class="h-4 w-4" />
            </Button>
        </a>
        <h1 class="text-3xl font-bold tracking-tight">{hunt.jobTitle}</h1>
    </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Main Job Info -->
                <Card.Root class="md:col-span-2">
                    <Card.Header>
                        <Card.Title>Job Description</Card.Title>
                    </Card.Header>
                    <Card.Content>
                        <p class="text-muted-foreground whitespace-pre-line">{hunt.jobDescription}</p>
                    </Card.Content>
                </Card.Root>

                <!-- Location Info -->
                <Card.Root>
                    <Card.Header>
                        <Card.Title>Location</Card.Title>
                    </Card.Header>
                    <Card.Content>
                        <div class="flex items-start gap-2">
                            <MapPin class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <p class="font-medium">{hunt.country}</p>
                                <p class="text-sm text-muted-foreground">
                                    {hunt.address.city}, {hunt.address.stateProvinceRegion}
                                    {#if hunt.address.address}
                                        <br>{hunt.address.address}
                                    {/if}
                                </p>
                            </div>
                        </div>
                    </Card.Content>
                </Card.Root>

                <!-- Qualifications -->
                <Card.Root>
                    <Card.Header>
                        <Card.Title>Qualifications</Card.Title>
                    </Card.Header>
                    <Card.Content class="space-y-4">
                        <div class="flex items-start gap-2">
                            <GraduationCap class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <p class="font-medium">Required Qualifications</p>
                                <p class="text-sm text-muted-foreground">{hunt.jobRequiredQualifications}</p>
                            </div>
                        </div>
                        
                        <div class="flex items-start gap-2">
                            <Briefcase class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <p class="font-medium">Experience</p>
                                <p class="text-sm text-muted-foreground">{hunt.jobRequiredWorkExperience} years minimum</p>
                            </div>
                        </div>
                        
                        <div class="flex items-start gap-2">
                            <Languages class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <p class="font-medium">Languages</p>
                                <div class="flex flex-wrap gap-1 mt-1">
                                    {#each hunt.jobRequiredLanguages as language}
                                        <Badge variant="secondary">{language === 'en' ? 'English' : language}</Badge>
                                    {/each}
                                </div>
                            </div>
                        </div>
                    </Card.Content>
                </Card.Root>

                <!-- Job Details -->
                <Card.Root>
                    <Card.Header>
                        <Card.Title>Job Details</Card.Title>
                    </Card.Header>
                    <Card.Content class="space-y-4">
                        <div class="flex items-start gap-2">
                            <Users class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <p class="font-medium">Profession</p>
                                <div class="flex flex-wrap gap-1 mt-1">
                                    {#each hunt.professions as profession}
                                        <Badge variant="secondary">{profession}</Badge>
                                    {/each}
                                </div>
                                {#if hunt.specialization}
                                    <p class="text-sm text-muted-foreground mt-1">Specialization: {hunt.specialization}</p>
                                {/if}
                            </div>
                        </div>
                        
                        <div class="flex items-start gap-2">
                            <Clock class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <p class="font-medium">Work Time</p>
                                <div class="flex flex-wrap gap-1 mt-1">
                                    {#each hunt.workTimeType as timeType}
                                        <Badge variant="secondary">{timeType}</Badge>
                                    {/each}
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex items-start gap-2">
                            <DollarSign class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <p class="font-medium">Salary</p>
                                <p class="text-sm text-muted-foreground">{hunt.salary.amountText}</p>
                                {#if hunt.salary.salaryExtra}
                                    <p class="text-sm text-muted-foreground">{hunt.salary.salaryExtra}</p>
                                {/if}
                            </div>
                        </div>
                    </Card.Content>
                </Card.Root>

                <!-- Additional Info -->
                <Card.Root>
                    <Card.Header>
                        <Card.Title>Additional Information</Card.Title>
                    </Card.Header>
                    <Card.Content class="space-y-4">
                        {#if hunt.extras.transportCompensationType}
                            <div class="flex items-start gap-2">
                                <Car class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <p class="font-medium">Transportation</p>
                                    <p class="text-sm text-muted-foreground">
                                        Transport compensation: {hunt.extras.transportCompensationType}
                                    </p>
                                    {#if hunt.extras.drivingLicenceRequired}
                                        <p class="text-sm text-muted-foreground">Driving license required</p>
                                    {/if}
                                    {#if hunt.extras.personalCarRequired}
                                        <p class="text-sm text-muted-foreground">Personal car required</p>
                                    {/if}
                                </div>
                            </div>
                        {/if}
                        
                        {#if hunt.extras.accommodationCompensationType}
                            <div class="flex items-start gap-2">
                                <Building class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <p class="font-medium">Accommodation</p>
                                    <p class="text-sm text-muted-foreground">
                                        Accommodation: {hunt.extras.accommodationCompensationType}
                                    </p>
                                </div>
                            </div>
                        {/if}
                    </Card.Content>
                </Card.Root>
            </div>
        
    <div class="flex justify-end gap-2">
        <Button variant="outline">Edit Hunt</Button>
    </div>
</div>