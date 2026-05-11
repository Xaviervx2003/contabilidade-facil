Property	Value
keywords	web-design, ui-design, layout, components, cards, animation, micro-interactions, typography
Structured SaaS Interface System
Purpose
Generate high-quality SaaS landing pages with strong structural layout, refined container framing, realistic product UI, and professional analytics dashboards.
The most important priorities are:
• layout structure
• container framing
• section separation
• realistic product interface visuals
• professional charts and dashboards
The final result should feel like a premium SaaS marketing page designed by a senior product designer, not a generic AI-generated landing page.
The design style combines:
• strong editorial layout structure
• refined light-mode SaaS design
• professional analytics UI
• subtle skeuomorphic hero cards
• clean flat sections after the hero
Avoid generic SaaS landing pages.
Layout Structure (Highest Priority)
Layout structure is the most important element.
Use a centered container layout.
Container width:
1280px – 1360px
Horizontal padding:
mobile: 24px
tablet: 40px
desktop: 64px
The page should feel spacious and balanced.
Avoid cramped layouts or content touching the viewport edges.
Example Container Structure
<div class="relative w-full max-w-[1360px] mx-auto px-6 lg:px-8">
  <!-- page content -->
</div>
Container Frame System
The layout must use a framed container structure.
The frame visually structures the page using:
• two vertical container edge lines
• horizontal section separators
• optional anchor dots
These elements create a structured editorial layout.
Vertical Container Lines
Add two thin vertical lines aligned with the container edges.
One line on the left container boundary
One line on the right container boundary
These lines should extend vertically across the page.
Do not create a full grid background.
Do not create repeated vertical columns.
Only use the two container edge lines.
Example Container Pattern
<div class="relative w-full max-w-[1360px] mx-auto px-6 lg:px-8">

  <div class="pointer-events-none absolute inset-0 flex justify-center">
    <div class="w-full max-w-[1360px] relative">

      <div class="absolute left-4 md:left-10 top-0 bottom-0 w-px bg-slate-200/70"></div>

      <div class="absolute right-4 md:right-10 top-0 bottom-0 w-px bg-slate-200/70"></div>

    </div>
  </div>

</div>
Always align frame lines with the container width, not the full viewport.
Horizontal Section Dividers
Add thin horizontal lines to separate major sections.
Examples:
hero
dashboard preview
features
how it works
testimonials or pricing
call to action
footer
These lines visually divide the layout into structured blocks.
Example Section Divider
<section class="relative py-24">

  <div class="absolute left-0 right-0 top-0 h-px bg-slate-200/60"></div>

  <div class="max-w-[1360px] mx-auto px-6 lg:px-8">
    ...
  </div>

</section>
Lines should be subtle and low contrast.
Anchor Dots
Small anchor dots may appear where lines intersect.
They should be minimal and refined.
Example
<div class="w-6 h-6 flex items-center justify-center">
  <div class="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
  <div class="absolute w-3.5 h-3.5 rounded-full border border-slate-300"></div>
</div>
Avoid decorative or playful dot patterns.
Grid System
Inside the container use a 12-column grid.
Common layout patterns:
hero centered across columns
6 / 6 split layout
4 / 4 / 4 feature grids
dashboard previews spanning 8–12 columns
Spacing between columns should feel balanced.
Example Grid
<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

  <div class="lg:col-span-6">...</div>

  <div class="lg:col-span-6">...</div>

</div>
Hero Section
The hero should be visually rich and product-focused.
Include:
• large headline
• supporting description
• primary CTA buttons
• product visuals
Below the hero content include three feature cards.
These cards should use soft skeuomorphic styling.
Hero card characteristics:
• layered surfaces
• subtle depth
• soft shadows
• tactile UI surfaces
Each card should include a mini interface preview such as:
KPI panel
analytics chart
metric widget
mini dashboard
Example Hero Card Pattern
<div class="rounded-[2rem] border border-gray-100 bg-white p-3 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06),inset_0_1px_0_white]">
  <div class="rounded-[1.5rem] border border-white/80 bg-gradient-to-br from-[#f8fafc] to-white shadow-[inset_0_2px_15px_rgba(0,0,0,0.03)] p-6">
    <!-- mini UI -->
  </div>
</div>
Hero cards should feel dimensional and tactile.
Product UI System
The page must include realistic product UI visuals.
Examples:
analytics dashboards
KPI metric panels
revenue charts
pipeline analytics
monitoring widgets
activity feeds
Avoid placeholder rectangles.
Product visuals should resemble real SaaS software.
Example UI Card
<div class="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">

  <div class="flex items-center justify-between mb-4">
    <span class="text-sm text-slate-500">Revenue Forecast</span>
    <span class="text-xs text-emerald-600">+12%</span>
  </div>

</div>
Chart Quality
Charts must feel professional and data-driven.
Examples:
bar charts
line charts
revenue graphs
pipeline analytics
performance dashboards
Charts should include:
axes
labels
legends
data hierarchy
Avoid decorative fake charts.
Example Chart Block
<div class="rounded-xl border border-slate-200 bg-white p-4">

  <div class="text-xs text-slate-400 mb-2">Revenue Growth</div>

  <div class="h-40">
    <!-- realistic chart -->
  </div>

</div>
Card System
Cards throughout the interface should be clean and polished.
Use:
rounded corners
subtle borders
soft shadows
generous internal padding
Hero cards may have more depth.
Other sections should remain flatter.
Example Card
<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
  ...
</div>
Section Design
After the hero, the design should transition into clean flat SaaS sections.
These sections should resemble high-end product marketing pages similar to:
Stripe
Linear
Vercel
Focus on:
structured content blocks
clean product visuals
minimal decoration
strong hierarchy
Avoid overly decorative sections.
Visual System
Use a refined light-mode palette.
Background examples:
#FAFAFB
#F8FAFC
#FFFFFF
Accent colors should be used sparingly.
Maintain strong readability and contrast.
Micro Interactions
Include subtle motion when appropriate.
Examples:
chart animations
hover effects on cards
button hover transitions
Animations should feel smooth and minimal.
Example
<div class="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
  ...
</div>
Typography
Use modern SaaS typography.
Examples:
Inter
Manrope
Plus Jakarta Sans
Maintain strong hierarchy between:
hero headline
section titles
body text
Example
<h1 class="text-6xl font-semibold tracking-tight text-slate-900">
  ...
</h1>

<p class="text-lg text-slate-500 max-w-2xl">
  ...
</p>
UX Principles
The page should follow strong UX structure.
Ensure:
clear hierarchy
scannable sections
balanced spacing
logical content flow
Users should quickly understand the product value.
Avoid dense text blocks.
Output
Generate a full SaaS landing page including:
hero section
dashboard preview
feature sections
how it works
testimonials or pricing
call to action
footer
The final result should resemble a premium SaaS marketing interface with framed container lines, structured layout, and realistic product UI.
Code examples should be used as guidelines, not copied as fixed templates.