---
name: wordpress
description: "Expert WordPress development guide covering block themes, theme.json, template hierarchy, custom post types, taxonomies, ACF/meta fields, REST API, WP-CLI, hooks (actions/filters), plugin development, Gutenberg blocks (React-based), WP_Query optimization, wpdb, security (nonces, capabilities, escaping), caching, multisite, and headless WordPress patterns."
version: 1.0.0
---

# WordPress Expert

## 1. Theme Development

### Block Themes (Full Site Editing)

Block themes replace traditional PHP templates with HTML template files and `theme.json` for global settings. This is the modern standard as of WordPress 6.0+.

```
my-theme/
  style.css              # Theme metadata (Name, Version, etc.)
  theme.json             # Global settings and styles
  functions.php          # Enqueues, supports, hooks
  templates/             # Full-page templates (HTML)
    index.html
    single.html
    page.html
    archive.html
    404.html
    home.html
    search.html
  parts/                 # Reusable template parts (HTML)
    header.html
    footer.html
    sidebar.html
  patterns/              # Block patterns (PHP)
    hero.php
    cta.php
  assets/
    css/
    js/
    images/
```

### theme.json Configuration

`theme.json` controls design tokens, block settings, and style presets globally.

```json
{
  "$schema": "https://schemas.wp.org/wp/6.5/theme.json",
  "version": 3,
  "settings": {
    "color": {
      "palette": [
        { "slug": "primary", "color": "#1a1a2e", "name": "Primary" },
        { "slug": "secondary", "color": "#e94560", "name": "Secondary" },
        { "slug": "surface", "color": "#f5f5f5", "name": "Surface" }
      ],
      "custom": false,
      "defaultPalette": false
    },
    "typography": {
      "fontFamilies": [
        {
          "fontFamily": "Inter, sans-serif",
          "slug": "body",
          "name": "Body",
          "fontFace": [
            {
              "fontFamily": "Inter",
              "fontWeight": "400 700",
              "fontStyle": "normal",
              "fontDisplay": "swap",
              "src": ["file:./assets/fonts/inter.woff2"]
            }
          ]
        }
      ],
      "fontSizes": [
        { "slug": "small", "size": "0.875rem", "name": "Small" },
        { "slug": "medium", "size": "1rem", "name": "Medium" },
        { "slug": "large", "size": "1.5rem", "name": "Large" },
        { "slug": "x-large", "size": "2.25rem", "name": "Extra Large" }
      ],
      "fluid": true
    },
    "spacing": {
      "units": ["px", "rem", "%"],
      "spacingSizes": [
        { "slug": "10", "size": "0.5rem", "name": "Tight" },
        { "slug": "20", "size": "1rem", "name": "Base" },
        { "slug": "30", "size": "1.5rem", "name": "Loose" },
        { "slug": "40", "size": "2rem", "name": "Wide" }
      ]
    },
    "layout": {
      "contentSize": "720px",
      "wideSize": "1200px"
    }
  },
  "styles": {
    "color": {
      "background": "var(--wp--preset--color--surface)",
      "text": "var(--wp--preset--color--primary)"
    },
    "typography": {
      "fontFamily": "var(--wp--preset--font-family--body)",
      "fontSize": "var(--wp--preset--font-size--medium)",
      "lineHeight": "1.6"
    },
    "elements": {
      "link": {
        "color": { "text": "var(--wp--preset--color--secondary)" }
      },
      "heading": {
        "typography": { "fontWeight": "700" }
      }
    }
  }
}
```

### Template Hierarchy

WordPress resolves templates in a specific priority order. Understand this to control which template renders.

```
Single Post:   single-{post-type}-{slug}.html -> single-{post-type}.html -> single.html -> singular.html -> index.html
Page:          page-{slug}.html -> page-{id}.html -> page.html -> singular.html -> index.html
Category:      category-{slug}.html -> category-{id}.html -> category.html -> archive.html -> index.html
Taxonomy:      taxonomy-{taxonomy}-{term}.html -> taxonomy-{taxonomy}.html -> taxonomy.html -> archive.html -> index.html
Author:        author-{nicename}.html -> author-{id}.html -> author.html -> archive.html -> index.html
Custom PT:     archive-{post-type}.html -> archive.html -> index.html
Search:        search.html -> index.html
404:           404.html -> index.html
```

### Block Template Example

```html
<!-- templates/single.html -->
<!-- wp:template-part {"slug":"header","tagName":"header"} /-->

<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->
<main class="wp-block-group">
  <!-- wp:post-title {"level":1} /-->
  <!-- wp:post-featured-image {"sizeSlug":"large"} /-->
  <!-- wp:post-date /-->
  <!-- wp:post-content {"layout":{"type":"constrained"}} /-->
  <!-- wp:post-terms {"term":"category"} /-->
</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->
```

---

## 2. Custom Post Types and Taxonomies

### Registering a Custom Post Type

```php
// functions.php or a custom plugin
add_action('init', function () {
    register_post_type('project', [
        'labels' => [
            'name'               => 'Projects',
            'singular_name'      => 'Project',
            'add_new_item'       => 'Add New Project',
            'edit_item'          => 'Edit Project',
            'view_item'          => 'View Project',
            'search_items'       => 'Search Projects',
            'not_found'          => 'No projects found',
        ],
        'public'             => true,
        'has_archive'        => true,
        'show_in_rest'       => true,   // Required for Gutenberg and REST API
        'supports'           => ['title', 'editor', 'thumbnail', 'excerpt', 'custom-fields'],
        'menu_icon'          => 'dashicons-portfolio',
        'rewrite'            => ['slug' => 'projects', 'with_front' => false],
        'capability_type'    => 'post',
        'map_meta_cap'       => true,
    ]);
});
```

### Registering a Custom Taxonomy

```php
add_action('init', function () {
    register_taxonomy('project_type', ['project'], [
        'labels' => [
            'name'          => 'Project Types',
            'singular_name' => 'Project Type',
            'add_new_item'  => 'Add New Project Type',
        ],
        'public'            => true,
        'hierarchical'      => true,    // true = categories, false = tags
        'show_in_rest'      => true,
        'show_admin_column'  => true,
        'rewrite'           => ['slug' => 'project-type'],
    ]);
});
```

### ACF / Custom Meta Fields

```php
// Register meta fields for REST API exposure (without ACF)
add_action('init', function () {
    register_post_meta('project', 'project_url', [
        'show_in_rest'  => true,
        'single'        => true,
        'type'          => 'string',
        'sanitize_callback' => 'esc_url_raw',
    ]);

    register_post_meta('project', 'project_year', [
        'show_in_rest'  => true,
        'single'        => true,
        'type'          => 'integer',
        'sanitize_callback' => 'absint',
    ]);
});

// With ACF: fields are auto-registered. Access with get_field():
$url = get_field('project_url', $post_id);
$year = get_field('project_year', $post_id);

// ACF fields in REST API (requires ACF to REST API plugin or manual registration):
add_filter('acf/settings/rest_api_format', function () {
    return 'standard';
});
```

---

## 3. REST API

### Custom Endpoints

```php
add_action('rest_api_init', function () {
    register_rest_route('myapp/v1', '/projects', [
        'methods'             => 'GET',
        'callback'            => 'myapp_get_projects',
        'permission_callback' => '__return_true',  // Public endpoint
        'args'                => [
            'per_page' => [
                'default'           => 10,
                'validate_callback' => function ($value) {
                    return is_numeric($value) && $value > 0 && $value <= 100;
                },
                'sanitize_callback' => 'absint',
            ],
            'project_type' => [
                'default'           => '',
                'sanitize_callback' => 'sanitize_text_field',
            ],
        ],
    ]);

    register_rest_route('myapp/v1', '/projects/(?P<id>\d+)', [
        'methods'             => 'GET',
        'callback'            => 'myapp_get_project',
        'permission_callback' => '__return_true',
        'args'                => [
            'id' => [
                'validate_callback' => function ($value) {
                    return is_numeric($value);
                },
            ],
        ],
    ]);

    register_rest_route('myapp/v1', '/projects', [
        'methods'             => 'POST',
        'callback'            => 'myapp_create_project',
        'permission_callback' => function () {
            return current_user_can('edit_posts');
        },
    ]);
});

function myapp_get_projects(WP_REST_Request $request): WP_REST_Response {
    $args = [
        'post_type'      => 'project',
        'posts_per_page' => $request->get_param('per_page'),
        'post_status'    => 'publish',
    ];

    $type = $request->get_param('project_type');
    if (!empty($type)) {
        $args['tax_query'] = [[
            'taxonomy' => 'project_type',
            'field'    => 'slug',
            'terms'    => $type,
        ]];
    }

    $query = new WP_Query($args);
    $data = array_map('myapp_format_project', $query->posts);

    return new WP_REST_Response([
        'data'  => $data,
        'total' => $query->found_posts,
        'pages' => $query->max_num_pages,
    ], 200);
}
```

### REST API Authentication

```php
// Application Passwords (built-in since WP 5.6)
// Users generate passwords in their profile.
// Client sends: Authorization: Basic base64(username:app-password)

// Nonce-based auth (for logged-in frontend JS)
wp_localize_script('my-script', 'myAppData', [
    'restUrl'  => rest_url('myapp/v1/'),
    'nonce'    => wp_create_nonce('wp_rest'),
]);
```

```javascript
// Frontend JS with nonce auth
const response = await fetch(myAppData.restUrl + 'projects', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': myAppData.nonce,
    },
    body: JSON.stringify({ title: 'New Project' }),
});
```

---

## 4. WP-CLI

### Essential Commands

```bash
# Core
wp core download
wp core install --url="example.com" --title="Site" --admin_user=admin --admin_email=admin@example.com
wp core update
wp core version

# Plugins
wp plugin install woocommerce --activate
wp plugin list --status=active --format=table
wp plugin deactivate akismet
wp plugin delete hello

# Themes
wp theme install flavor --activate
wp theme list

# Database
wp db export backup.sql
wp db import backup.sql
wp db query "SELECT ID, user_login FROM wp_users LIMIT 5"
wp db optimize
wp db repair

# Search and replace (safe for serialized data)
wp search-replace 'http://old.com' 'https://new.com' --dry-run
wp search-replace 'http://old.com' 'https://new.com' --all-tables

# Users
wp user create editor editor@example.com --role=editor --user_pass=secure123
wp user list --role=administrator

# Posts
wp post create --post_type=project --post_title='My Project' --post_status=publish
wp post list --post_type=project --format=json
wp post delete 123 --force

# Transients and cache
wp transient delete --all
wp cache flush

# Cron
wp cron event list
wp cron event run --all

# Scaffold
wp scaffold post-type project --label="Project" --textdomain="mytheme"
wp scaffold taxonomy project_type --post_types=project --textdomain="mytheme"
wp scaffold block my-block --title="My Block" --namespace="myapp"
wp scaffold plugin my-plugin
```

---

## 5. Hooks System (Actions and Filters)

### Actions -- Execute Code at Specific Points

```php
// Register an action
add_action('save_post_project', function (int $post_id, WP_Post $post, bool $update): void {
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    if (wp_is_post_revision($post_id)) {
        return;
    }

    // Clear cached project list when a project is saved
    delete_transient('myapp_projects_list');

    // Sync to external API
    myapp_sync_project_to_external($post_id);
}, 10, 3);

// Common action hooks and when they fire:
// init                   -- After WP loads, before headers sent
// wp_enqueue_scripts     -- Enqueue frontend CSS/JS
// admin_enqueue_scripts  -- Enqueue admin CSS/JS
// rest_api_init          -- Register REST routes
// save_post              -- After a post is saved
// delete_post            -- Before a post is deleted
// wp_login               -- After user logs in
// wp_logout              -- After user logs out
// template_redirect      -- Before template loads, after query is set
// wp_head                -- Inside <head> tag
// wp_footer              -- Before </body> tag
```

### Filters -- Modify Data in the Pipeline

```php
// Modify the main query
add_filter('pre_get_posts', function (WP_Query $query): WP_Query {
    if (!is_admin() && $query->is_main_query() && is_post_type_archive('project')) {
        $query->set('posts_per_page', 12);
        $query->set('orderby', 'menu_order');
        $query->set('order', 'ASC');
    }
    return $query;
});

// Modify REST API response
add_filter('rest_prepare_project', function (WP_REST_Response $response, WP_Post $post): WP_REST_Response {
    $response->data['project_url'] = get_post_meta($post->ID, 'project_url', true);
    $response->data['project_year'] = (int) get_post_meta($post->ID, 'project_year', true);
    return $response;
}, 10, 2);

// Add custom image sizes
add_action('after_setup_theme', function (): void {
    add_image_size('project-card', 600, 400, true);
    add_image_size('project-hero', 1200, 600, true);
});

// Filter the image sizes available in the editor
add_filter('image_size_names_choose', function (array $sizes): array {
    $sizes['project-card'] = 'Project Card';
    $sizes['project-hero'] = 'Project Hero';
    return $sizes;
});
```

---

## 6. Plugin Development

### Plugin Structure

```
my-plugin/
  my-plugin.php          # Main plugin file with header
  includes/
    class-admin.php      # Admin functionality
    class-api.php        # REST API endpoints
    class-cpt.php        # Custom post types
  assets/
    css/
    js/
  templates/             # Frontend templates
  languages/             # Translation files
  readme.txt             # WordPress.org readme
```

### Main Plugin File

```php
<?php
/**
 * Plugin Name: My Plugin
 * Description: A well-structured WordPress plugin.
 * Version: 1.0.0
 * Author: Developer Name
 * Text Domain: my-plugin
 * Requires at least: 6.0
 * Requires PHP: 8.1
 */

defined('ABSPATH') || exit;

define('MY_PLUGIN_VERSION', '1.0.0');
define('MY_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('MY_PLUGIN_URL', plugin_dir_url(__FILE__));

// Autoload classes
spl_autoload_register(function (string $class): void {
    $prefix = 'MyPlugin\\';
    if (strpos($class, $prefix) !== 0) {
        return;
    }
    $relative = substr($class, strlen($prefix));
    $file = MY_PLUGIN_DIR . 'includes/class-' . strtolower(str_replace('\\', '-', $relative)) . '.php';
    if (file_exists($file)) {
        require $file;
    }
});

// Activation hook
register_activation_hook(__FILE__, function (): void {
    flush_rewrite_rules();
    // Create custom tables, set default options, etc.
});

// Deactivation hook
register_deactivation_hook(__FILE__, function (): void {
    flush_rewrite_rules();
});

// Initialize the plugin
add_action('plugins_loaded', function (): void {
    new MyPlugin\Admin();
    new MyPlugin\API();
    new MyPlugin\CPT();
});
```

---

## 7. Gutenberg Block Development

### Block Registration (React-based)

```javascript
// src/blocks/project-card/index.js
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls, RichText } from '@wordpress/block-editor';
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components';

registerBlockType('myapp/project-card', {
    title: 'Project Card',
    icon: 'portfolio',
    category: 'widgets',
    attributes: {
        title: { type: 'string', default: '' },
        description: { type: 'string', default: '' },
        url: { type: 'string', default: '' },
        showYear: { type: 'boolean', default: true },
    },

    edit({ attributes, setAttributes }) {
        const blockProps = useBlockProps({ className: 'project-card' });

        return (
            <>
                <InspectorControls>
                    <PanelBody title="Project Settings">
                        <TextControl
                            label="Project URL"
                            value={attributes.url}
                            onChange={(url) => setAttributes({ url })}
                        />
                        <ToggleControl
                            label="Show Year"
                            checked={attributes.showYear}
                            onChange={(showYear) => setAttributes({ showYear })}
                        />
                    </PanelBody>
                </InspectorControls>
                <div {...blockProps}>
                    <RichText
                        tagName="h3"
                        value={attributes.title}
                        onChange={(title) => setAttributes({ title })}
                        placeholder="Project title..."
                    />
                    <RichText
                        tagName="p"
                        value={attributes.description}
                        onChange={(description) => setAttributes({ description })}
                        placeholder="Project description..."
                    />
                </div>
            </>
        );
    },

    save({ attributes }) {
        const blockProps = useBlockProps.save({ className: 'project-card' });

        return (
            <div {...blockProps}>
                <RichText.Content tagName="h3" value={attributes.title} />
                <RichText.Content tagName="p" value={attributes.description} />
                {attributes.url && (
                    <a href={attributes.url} target="_blank" rel="noopener noreferrer">
                        View Project
                    </a>
                )}
            </div>
        );
    },
});
```

### block.json

```json
{
    "$schema": "https://schemas.wp.org/trunk/block.json",
    "apiVersion": 3,
    "name": "myapp/project-card",
    "title": "Project Card",
    "category": "widgets",
    "icon": "portfolio",
    "description": "Display a project card with title, description, and link.",
    "textdomain": "myapp",
    "editorScript": "file:./index.js",
    "editorStyle": "file:./index.css",
    "style": "file:./style-index.css",
    "attributes": {
        "title": { "type": "string", "default": "" },
        "description": { "type": "string", "default": "" },
        "url": { "type": "string", "default": "" },
        "showYear": { "type": "boolean", "default": true }
    },
    "supports": {
        "html": false,
        "align": ["wide", "full"],
        "color": { "background": true, "text": true },
        "spacing": { "margin": true, "padding": true }
    }
}
```

---

## 8. WP_Query Optimization

### Efficient Query Patterns

```php
// GOOD: Fetch only what you need
$projects = new WP_Query([
    'post_type'      => 'project',
    'posts_per_page' => 12,
    'post_status'    => 'publish',
    'fields'         => 'ids',          // Return only IDs if you do not need full objects
    'no_found_rows'  => true,           // Skip SQL_CALC_FOUND_ROWS if you do not need pagination
    'update_post_meta_cache' => false,  // Skip meta cache priming if you do not use meta
    'update_post_term_cache' => false,  // Skip term cache priming if you do not use terms
]);

// BAD: Querying all posts with all caches
$projects = new WP_Query([
    'post_type'      => 'project',
    'posts_per_page' => -1,             // Never use -1 in production queries
]);

// Meta query with index-friendly patterns
$featured = new WP_Query([
    'post_type'      => 'project',
    'posts_per_page' => 6,
    'meta_query'     => [
        'relation' => 'AND',
        [
            'key'     => 'is_featured',
            'value'   => '1',
            'compare' => '=',
        ],
        [
            'key'     => 'project_year',
            'value'   => 2024,
            'compare' => '>=',
            'type'    => 'NUMERIC',
        ],
    ],
    'orderby'  => 'meta_value_num',
    'meta_key' => 'project_year',
    'order'    => 'DESC',
]);
```

### Direct Database Queries (wpdb)

```php
global $wpdb;

// ALWAYS use prepared statements
$results = $wpdb->get_results(
    $wpdb->prepare(
        "SELECT p.ID, p.post_title, pm.meta_value AS project_url
         FROM {$wpdb->posts} p
         INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id AND pm.meta_key = %s
         WHERE p.post_type = %s AND p.post_status = %s
         ORDER BY p.post_date DESC
         LIMIT %d",
        'project_url',
        'project',
        'publish',
        20
    )
);

// Insert with prepared statements
$wpdb->insert(
    $wpdb->prefix . 'custom_table',
    [
        'user_id'    => $user_id,
        'score'      => $score,
        'created_at' => current_time('mysql'),
    ],
    ['%d', '%d', '%s']
);

// Update with prepared statements
$wpdb->update(
    $wpdb->prefix . 'custom_table',
    ['score' => $new_score],       // data
    ['id' => $row_id],             // where
    ['%d'],                        // data format
    ['%d']                         // where format
);
```

---

## 9. Security

### Nonces -- CSRF Protection

```php
// Generate nonce in form
wp_nonce_field('myapp_save_project', 'myapp_nonce');

// Verify nonce on submission
if (!isset($_POST['myapp_nonce']) || !wp_verify_nonce($_POST['myapp_nonce'], 'myapp_save_project')) {
    wp_die('Security check failed.');
}

// Nonce URLs for action links
$delete_url = wp_nonce_url(
    admin_url('admin-post.php?action=delete_project&id=' . $post_id),
    'delete_project_' . $post_id
);
```

### Capability Checks

```php
// Always check capabilities before performing actions
if (!current_user_can('edit_post', $post_id)) {
    wp_die('You do not have permission to edit this post.');
}

// Custom capabilities for custom post types
register_post_type('project', [
    'capability_type' => ['project', 'projects'],
    'map_meta_cap'    => true,
]);

// Grant capabilities to a role
$editor = get_role('editor');
$editor->add_cap('edit_projects');
$editor->add_cap('publish_projects');
$editor->add_cap('delete_projects');
```

### Escaping Output

```php
// ALWAYS escape output based on context
echo esc_html($user_input);                  // HTML body text
echo esc_attr($user_input);                  // HTML attribute values
echo esc_url($user_input);                   // URLs (href, src)
echo esc_js($user_input);                    // Inline JavaScript strings
echo wp_kses_post($user_input);              // Allow safe HTML (post content subset)
echo wp_kses($input, ['a' => ['href' => []]]); // Custom allowed HTML

// Sanitize input on save
$clean_title = sanitize_text_field($_POST['title']);
$clean_email = sanitize_email($_POST['email']);
$clean_url   = esc_url_raw($_POST['url']);
$clean_html  = wp_kses_post($_POST['content']);
```

---

## 10. Caching

### Transients API

```php
// Cache expensive query results
function myapp_get_featured_projects(): array {
    $cached = get_transient('myapp_featured_projects');
    if ($cached !== false) {
        return $cached;
    }

    $query = new WP_Query([
        'post_type'      => 'project',
        'posts_per_page' => 6,
        'meta_key'       => 'is_featured',
        'meta_value'     => '1',
    ]);

    $projects = array_map(function ($post) {
        return [
            'id'    => $post->ID,
            'title' => $post->post_title,
            'url'   => get_permalink($post),
        ];
    }, $query->posts);

    set_transient('myapp_featured_projects', $projects, HOUR_IN_SECONDS);

    return $projects;
}

// Invalidate cache when projects change
add_action('save_post_project', function (): void {
    delete_transient('myapp_featured_projects');
});
```

### Object Cache (Persistent)

```php
// Object cache works with Redis/Memcached via drop-in plugins
// (redis-cache, memcached, etc.)

// Store in object cache (survives the request if persistent cache is configured)
wp_cache_set('user_scores', $scores, 'myapp', 3600);

// Retrieve from object cache
$scores = wp_cache_get('user_scores', 'myapp');
if ($scores === false) {
    $scores = myapp_calculate_scores();
    wp_cache_set('user_scores', $scores, 'myapp', 3600);
}

// Delete from cache
wp_cache_delete('user_scores', 'myapp');
```

### Fragment Caching

```php
// Cache expensive template fragments
function myapp_render_sidebar(): string {
    $cache_key = 'myapp_sidebar_' . get_the_ID();
    $output = wp_cache_get($cache_key, 'myapp_fragments');

    if ($output === false) {
        ob_start();
        // Expensive rendering logic here
        get_template_part('parts/sidebar-widgets');
        $output = ob_get_clean();
        wp_cache_set($cache_key, $output, 'myapp_fragments', 300);
    }

    return $output;
}
```

---

## 11. Multisite

### Multisite Configuration

```php
// wp-config.php additions for multisite
define('WP_ALLOW_MULTISITE', true);

// After network setup:
define('MULTISITE', true);
define('SUBDOMAIN_INSTALL', false);  // true for subdomain, false for subdirectory
define('DOMAIN_CURRENT_SITE', 'example.com');
define('PATH_CURRENT_SITE', '/');
define('SITE_ID_CURRENT_SITE', 1);
define('BLOG_ID_CURRENT_SITE', 1);
```

### Site Switching

```php
// Switch to another site in the network
switch_to_blog(2);
$posts = get_posts(['post_type' => 'post', 'numberposts' => 5]);
restore_current_blog();  // Always restore

// Get all sites
$sites = get_sites(['number' => 100, 'public' => 1]);
foreach ($sites as $site) {
    switch_to_blog($site->blog_id);
    // Do something per site
    restore_current_blog();
}

// Network-wide queries (use sparingly)
global $wpdb;
$blog_ids = $wpdb->get_col("SELECT blog_id FROM {$wpdb->blogs} WHERE public = 1");
```

---

## 12. Headless WordPress

### WPGraphQL

```graphql
# Query posts with WPGraphQL
query GetProjects {
  projects(first: 10, where: { status: PUBLISH }) {
    nodes {
      id
      title
      slug
      excerpt
      featuredImage {
        node {
          sourceUrl(size: LARGE)
          altText
        }
      }
      projectFields {
        projectUrl
        projectYear
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}

# Mutations
mutation CreateProject($title: String!, $content: String!) {
  createProject(input: { title: $title, content: $content, status: PUBLISH }) {
    project {
      id
      slug
    }
  }
}
```

### Headless Frontend Pattern (Next.js)

```typescript
// lib/wordpress.ts
const WP_GRAPHQL_URL = process.env.NEXT_PUBLIC_WP_GRAPHQL_URL;

export async function fetchGraphQL<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(WP_GRAPHQL_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
        next: { revalidate: 60 },  // ISR: revalidate every 60 seconds
    });

    if (!response.ok) {
        throw new Error('WordPress GraphQL request failed: ' + response.statusText);
    }

    const json = await response.json();
    if (json.errors) {
        throw new Error('GraphQL errors: ' + JSON.stringify(json.errors));
    }

    return json.data as T;
}

// Usage in a Next.js page
export async function getStaticProps() {
    const data = await fetchGraphQL<{ projects: { nodes: Project[] } }>(`
        query {
            projects(first: 12) {
                nodes { id title slug excerpt }
            }
        }
    `);

    return {
        props: { projects: data.projects.nodes },
        revalidate: 60,
    };
}
```

### REST API for Headless

```typescript
// Fetching from WP REST API
const WP_API_URL = process.env.NEXT_PUBLIC_WP_API_URL;

export async function getProjects(page = 1, perPage = 12): Promise<{ data: Project[]; total: number }> {
    const url = new URL(`${WP_API_URL}/wp/v2/projects`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', String(perPage));
    url.searchParams.set('_embed', 'true');  // Include featured images, terms, etc.

    const response = await fetch(url.toString(), {
        next: { revalidate: 60 },
    });

    return {
        data: await response.json(),
        total: parseInt(response.headers.get('X-WP-Total') || '0', 10),
    };
}
```

---

## 13. Common Anti-Patterns

### Querying Without Limits

```php
// BAD: Loads all posts into memory
$all = new WP_Query(['post_type' => 'project', 'posts_per_page' => -1]);

// GOOD: Paginate or set a reasonable limit
$page = new WP_Query(['post_type' => 'project', 'posts_per_page' => 20, 'paged' => $current_page]);
```

### Direct Database Access Without Preparation

```php
// BAD: SQL injection vulnerability
$wpdb->query("DELETE FROM {$wpdb->posts} WHERE ID = " . $_GET['id']);

// GOOD: Always use prepare()
$wpdb->query($wpdb->prepare("DELETE FROM {$wpdb->posts} WHERE ID = %d", absint($_GET['id'])));
```

### Skipping Nonce Verification

```php
// BAD: No CSRF protection
if (isset($_POST['action']) && $_POST['action'] === 'save') {
    update_post_meta($id, 'key', $_POST['value']);
}

// GOOD: Verify nonce first
if (!wp_verify_nonce($_POST['_nonce'], 'save_action')) {
    wp_die('Invalid nonce');
}
```

### Loading Everything in functions.php

```php
// BAD: 2000-line functions.php
// GOOD: Split into focused includes
require_once get_template_directory() . '/inc/post-types.php';
require_once get_template_directory() . '/inc/taxonomies.php';
require_once get_template_directory() . '/inc/rest-api.php';
require_once get_template_directory() . '/inc/blocks.php';
```

---

## 14. Critical Reminders

### ALWAYS

- Use `show_in_rest => true` on custom post types and taxonomies for Gutenberg compatibility
- Escape all output with the appropriate function (`esc_html`, `esc_attr`, `esc_url`)
- Sanitize all input (`sanitize_text_field`, `absint`, `esc_url_raw`)
- Verify nonces on form submissions and AJAX handlers
- Check capabilities before performing privileged actions
- Use `$wpdb->prepare()` for all direct database queries
- Use `no_found_rows => true` when pagination is not needed
- Invalidate caches (transients, object cache) when underlying data changes
- Prefix all function names, hooks, meta keys, and option names with your namespace

### NEVER

- Use `posts_per_page => -1` on user-facing queries
- Echo unsanitized user input
- Concatenate user input into SQL strings
- Use `extract()` -- it creates variables from arrays and obscures data flow
- Store sensitive data in post meta without encryption
- Modify core WordPress files (use hooks and filters instead)
- Skip `wp_die()` after `wp_redirect()`
- Trust `$_GET`, `$_POST`, or `$_REQUEST` values without sanitization
- Use `query_posts()` -- use `WP_Query` or `pre_get_posts` filter instead
