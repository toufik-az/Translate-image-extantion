"""
Simple script to create placeholder icons for the Manga Translator extension
Creates basic PNG icons using PIL (Pillow)
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    import os
    
    # Icon sizes
    sizes = [48, 96]
    
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    for size in sizes:
        # Create a new image with gradient-like background
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        # Draw a circular background with purple gradient effect
        center = size // 2
        radius = size // 2 - 2
        
        # Draw circle
        draw.ellipse(
            [center - radius, center - radius, center + radius, center + radius],
            fill=(102, 126, 234, 255),
            outline=(90, 77, 159, 255),
            width=2
        )
        
        # Draw a simple book icon
        book_width = size // 2
        book_height = size // 1.6
        book_x = (size - book_width) // 2
        book_y = (size - book_height) // 2
        
        # Book rectangle
        draw.rectangle(
            [book_x, book_y, book_x + book_width, book_y + book_height],
            fill=(255, 255, 255, 230)
        )
        
        # Book spine
        draw.line(
            [center, book_y, center, book_y + book_height],
            fill=(102, 126, 234, 255),
            width=2
        )
        
        # Add some text lines to represent content
        line_y = book_y + size // 8
        line_spacing = size // 10
        
        for i in range(3):
            # Left page
            draw.line(
                [book_x + 4, line_y + i * line_spacing, 
                 center - 4, line_y + i * line_spacing],
                fill=(100, 100, 100, 200),
                width=1
            )
            # Right page
            draw.line(
                [center + 4, line_y + i * line_spacing,
                 book_x + book_width - 4, line_y + i * line_spacing],
                fill=(100, 100, 100, 200),
                width=1
            )
        
        # Add translation arrows
        arrow_y1 = book_y + size // 6
        arrow_y2 = book_y + book_height - size // 6
        
        # Left to right arrow
        draw.line([book_x + 4, arrow_y1, center - 6, arrow_y1], 
                  fill=(102, 126, 234, 255), width=2)
        draw.polygon([center - 6, arrow_y1 - 3, center - 6, arrow_y1 + 3, 
                     center - 2, arrow_y1], fill=(102, 126, 234, 255))
        
        # Right to left arrow
        draw.line([center + 6, arrow_y2, book_x + book_width - 4, arrow_y2],
                  fill=(118, 75, 162, 255), width=2)
        draw.polygon([center + 6, arrow_y2 - 3, center + 6, arrow_y2 + 3,
                     center + 2, arrow_y2], fill=(118, 75, 162, 255))
        
        # Save the image
        filename = f'icon-{size}.png'
        filepath = os.path.join(script_dir, filename)
        img.save(filepath, 'PNG')
        print(f'Created {filename}')
    
    print('Icons created successfully!')

except ImportError:
    print('PIL/Pillow not installed. Installing...')
    print('Run: pip install Pillow')
    print('')
    print('Alternatively, you can:')
    print('1. Open generate-icons.html in a browser')
    print('2. Or create icons manually using any image editor')
    print('3. Save as icon-48.png and icon-96.png in the icons folder')
